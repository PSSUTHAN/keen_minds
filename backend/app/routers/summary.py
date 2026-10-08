from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import datetime
from app.database import get_db
from app.models import KioskSession, ClinicalSummary, Doctor, Patient, User
from app.schemas import ClinicalSummaryResponse, DoctorVerifySummaryRequest
from app.services.ai_service import generate_structured_summary
from app.services.fhir_service import build_fhir_bundle
from app.services.auth_service import (
    get_current_user,
    require_role,
    check_doctor_patient_access,
    log_audit
)

router = APIRouter(prefix="/summary", tags=["AI Clinical Summary Generator"])

def verify_session_summary_access(session: KioskSession, current_user: User, db: Session):
    """Verifies that the current user has authorized access to this session's clinical summary."""
    if current_user.role == "PATIENT":
        if current_user.patient_id != session.patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot access summary for another patient's session."
            )
    elif current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, session.patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before accessing clinical summary."
            )
    elif current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied.")

@router.post("/generate/{session_id}", response_model=ClinicalSummaryResponse)
def generate_summary_for_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_summary_access(session, current_user, db)

    history_entries = [
        {
            "section": entry.section,
            "question": entry.question,
            "response": entry.response,
            "ayush_category": entry.ayush_category
        }
        for entry in session.history_entries
    ]

    documents = [
        {
            "doc_type": doc.doc_type,
            "file_name": doc.file_name,
            "extracted_entities": doc.extracted_entities or {},
            "patient_verified": doc.patient_verified
        }
        for doc in session.documents
    ]

    summary_data = generate_structured_summary(
        history_entries=history_entries,
        documents=documents,
        ayush_mode=session.ayush_mode
    )

    # Build FHIR R4 Bundle
    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    patient_dict = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.phone,
        "abha_id": patient.abha_id
    } if patient else {}

    fhir_bundle = build_fhir_bundle(summary_data, patient_dict)

    existing_summary = db.query(ClinicalSummary).filter(ClinicalSummary.session_id == session_id).first()
    if existing_summary:
        existing_summary.chief_complaint = summary_data["chief_complaint"]
        existing_summary.hpi = summary_data["hpi"]
        existing_summary.past_medical_surgical = summary_data["past_medical_surgical"]
        existing_summary.medication_history = summary_data["medication_history"]
        existing_summary.allergy_history = summary_data["allergy_history"]
        existing_summary.family_history = summary_data["family_history"]
        existing_summary.personal_history = summary_data["personal_history"]
        existing_summary.ayush_assessment = summary_data["ayush_assessment"]
        existing_summary.review_of_systems = summary_data["review_of_systems"]
        existing_summary.previous_investigations = summary_data["previous_investigations"]
        existing_summary.missing_or_uncertain_info = summary_data["missing_or_uncertain_info"]
        existing_summary.fhir_bundle = fhir_bundle
        existing_summary.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing_summary)
        summary_obj = existing_summary
    else:
        summary_obj = ClinicalSummary(
            session_id=session_id,
            chief_complaint=summary_data["chief_complaint"],
            hpi=summary_data["hpi"],
            past_medical_surgical=summary_data["past_medical_surgical"],
            medication_history=summary_data["medication_history"],
            allergy_history=summary_data["allergy_history"],
            family_history=summary_data["family_history"],
            personal_history=summary_data["personal_history"],
            ayush_assessment=summary_data["ayush_assessment"],
            review_of_systems=summary_data["review_of_systems"],
            previous_investigations=summary_data["previous_investigations"],
            missing_or_uncertain_info=summary_data["missing_or_uncertain_info"],
            fhir_bundle=fhir_bundle,
            doctor_verified=False
        )
        db.add(summary_obj)
        db.commit()
        db.refresh(summary_obj)

    # Mark session status ready for doctor
    session.status = "awaiting_doctor"
    db.commit()

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "SUMMARY_GENERATED",
        "clinical_summary",
        str(summary_obj.id),
        f"Generated AI clinical summary for session #{session_id}."
    )

    return summary_obj

@router.get("/session/{session_id}", response_model=ClinicalSummaryResponse)
def get_session_summary(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_summary_access(session, current_user, db)

    summary = db.query(ClinicalSummary).filter(ClinicalSummary.session_id == session_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found for this session")

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "SUMMARY_VIEWED",
        "clinical_summary",
        str(summary.id),
        f"Viewed clinical summary for session #{session_id}."
    )

    return summary

@router.put("/verify/{summary_id}", response_model=ClinicalSummaryResponse)
def doctor_verify_summary(
    summary_id: int,
    payload: DoctorVerifySummaryRequest,
    current_user: User = Depends(require_role(["DOCTOR"])),
    db: Session = Depends(get_db)
):
    summary = db.query(ClinicalSummary).filter(ClinicalSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    session = db.query(KioskSession).filter(KioskSession.id == summary.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ensure the doctor verifying is the authenticated doctor
    if payload.doctor_id and current_user.doctor_id != payload.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot verify a summary under another physician's credentials."
        )

    doctor_id = current_user.doctor_id
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    if not check_doctor_patient_access(doctor.id, session.patient_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You must verify patient consent via OTP before verifying clinical summary."
        )

    if payload.chief_complaint is not None:
        summary.chief_complaint = payload.chief_complaint
    if payload.hpi is not None:
        summary.hpi = payload.hpi
    if payload.past_medical_surgical is not None:
        summary.past_medical_surgical = payload.past_medical_surgical
    if payload.medication_history is not None:
        summary.medication_history = payload.medication_history
    if payload.allergy_history is not None:
        summary.allergy_history = payload.allergy_history
    if payload.family_history is not None:
        summary.family_history = payload.family_history
    if payload.personal_history is not None:
        summary.personal_history = payload.personal_history
    if payload.ayush_assessment is not None:
        summary.ayush_assessment = payload.ayush_assessment
    if payload.review_of_systems is not None:
        summary.review_of_systems = payload.review_of_systems
    if payload.previous_investigations is not None:
        summary.previous_investigations = payload.previous_investigations

    summary.doctor_notes = payload.doctor_notes
    summary.doctor_verified = payload.doctor_verified
    summary.verified_by_doctor_id = doctor.id
    summary.updated_at = datetime.datetime.utcnow()

    # Update kiosk session status to completed
    session.status = "completed"

    db.commit()
    db.refresh(summary)

    log_audit(
        db,
        current_user.id,
        "DOCTOR",
        "SUMMARY_VERIFIED",
        "clinical_summary",
        str(summary.id),
        f"Dr. {doctor.name} verified and approved summary #{summary.id}."
    )

    return summary
