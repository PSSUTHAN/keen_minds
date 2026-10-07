import os
import uuid
import mimetypes
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.database import get_db
from app.models import Patient, KioskSession, Prescription, PrescriptionItem, Doctor, User, PatientMedicalReport, DoctorViewedPatient, DoctorPatient, EmergencyAlert, DoctorPatientAccess
from app.schemas import (
    PatientCreate,
    PatientResponse,
    PatientLoginRequest,
    PatientSearchItem,
    PatientMedicalRecordResponse,
    PastMedicalHistoryItem,
    PrescriptionResponse,
    PatientReportResponse
)
from fastapi.security import HTTPAuthorizationCredentials
from app.services.auth_service import (
    get_current_user,
    require_role,
    log_audit,
    decode_access_token,
    security_bearer,
    check_doctor_patient_access
)
from app.routers.prescriptions import format_prescription_response

router = APIRouter(prefix="/patients", tags=["Patients"])

UPLOAD_REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "reports")

def format_report_response(rep: PatientMedicalReport) -> PatientReportResponse:
    return PatientReportResponse(
        id=rep.id,
        patient_id=rep.patient_id,
        report_name=rep.report_name,
        report_type=rep.report_type,
        report_date=rep.report_date,
        description=rep.description,
        file_name=rep.file_name,
        file_size_bytes=rep.file_size_bytes,
        mime_type=rep.mime_type,
        created_at=rep.created_at,
        view_url=f"/api/v1/patients/{rep.patient_id}/reports/{rep.id}/view",
        download_url=f"/api/v1/patients/{rep.patient_id}/reports/{rep.id}/download"
    )

def get_user_from_token_or_query(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Authenticates user from either Authorization: Bearer <token> or ?token=<token> query parameter.
    Enables inline PDF/image rendering in iframe/img tags while preserving strict RBAC security.
    """
    raw_token = None
    if auth_credentials and auth_credentials.credentials:
        raw_token = auth_credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide Authorization header or token query parameter."
        )

    payload = decode_access_token(raw_token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or deactivated.")
    return user

class PatientProfileUpdateRequest(BaseModel):
    email: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = None

@router.get("/search", response_model=List[PatientSearchItem])
def search_patients(
    q: Optional[str] = "",
    current_user: User = Depends(require_role(["DOCTOR"])),
    db: Session = Depends(get_db)
):
    """
    Search patients by Patient ID, Mobile Number, ABHA ID, or Name.
    Strictly restricted to DOCTOR role.
    """
    query_str = (q or "").strip()
    query = db.query(Patient)

    if query_str:
        filters = [
            Patient.name.ilike(f"%{query_str}%"),
            Patient.phone.like(f"%{query_str}%"),
            Patient.abha_id.like(f"%{query_str}%")
        ]
        if query_str.isdigit():
            filters.append(Patient.id == int(query_str))
        query = query.filter(or_(*filters))

    patients = query.order_by(Patient.id.desc()).limit(30).all()

    results = []
    for p in patients:
        # Check active diagnosis
        active_rx = (
            db.query(Prescription)
            .filter(Prescription.patient_id == p.id, Prescription.status == "ACTIVE")
            .first()
        )
        active_diag = active_rx.diagnosis if active_rx else None

        results.append(
            PatientSearchItem(
                id=p.id,
                name=p.name,
                age=p.age,
                gender=p.gender,
                phone=p.phone,
                abha_id=p.abha_id,
                blood_group=p.blood_group,
                active_diagnosis=active_diag
            )
        )

    return results

@router.get("/{patient_id}/record", response_model=PatientMedicalRecordResponse)
def get_patient_medical_record(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the comprehensive Patient Medical Record divided into 4 separated sections:
    1. Patient Information (Read-Only)
    2. Past Medical History (Strictly READ-ONLY with no modification permissions)
    3. Current Prescription (Active prescription, with doctor ownership check)
    4. Prescription History (Immutable historical records, READ-ONLY)

    Access Control:
    - PATIENT: Only allowed to view their own record.
    - DOCTOR: Authorized to view patient record.
    """
    # 1. Access Control
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not authorized to view another patient's medical records."
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # 2. Audit Log & Viewed Patients Tracking for Doctor
    if current_user.role == "DOCTOR":
        doctor_id = current_user.doctor_id
        if not check_doctor_patient_access(doctor_id, patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before viewing their medical history."
            )

        if doctor_id:
            viewed_entry = db.query(DoctorViewedPatient).filter(
                DoctorViewedPatient.doctor_id == doctor_id,
                DoctorViewedPatient.patient_id == patient_id
            ).first()
            if viewed_entry:
                viewed_entry.last_viewed_at = datetime.datetime.utcnow()
            else:
                viewed_entry = DoctorViewedPatient(
                    doctor_id=doctor_id,
                    patient_id=patient_id,
                    first_viewed_at=datetime.datetime.utcnow(),
                    last_viewed_at=datetime.datetime.utcnow()
                )
                db.add(viewed_entry)
            db.commit()

        log_audit(
            db,
            current_user.id,
            "DOCTOR",
            "PATIENT_RECORD_VIEWED",
            "patient",
            str(patient.id),
            f"Dr. {current_user.doctor.name if current_user.doctor else 'Doctor'} viewed medical record of patient #{patient.id}."
        )

    # 3. Section A: Patient Information
    patient_info = PatientResponse.from_orm(patient)

    # 4. Section B: Past Medical History (From intake sessions and clinical summaries)
    sessions = (
        db.query(KioskSession)
        .filter(KioskSession.patient_id == patient_id)
        .order_by(KioskSession.created_at.desc())
        .all()
    )

    past_medical_history = []
    for s in sessions:
        docs_summary = [
            {
                "file_name": doc.file_name,
                "doc_type": doc.doc_type,
                "confidence": doc.ocr_confidence,
                "extracted": doc.extracted_entities
            }
            for doc in s.documents
        ]

        past_medical_history.append(
            PastMedicalHistoryItem(
                session_id=s.id,
                session_token=s.session_token,
                date=s.created_at,
                method="AYUSH Method (Dashavidha)" if s.ayush_mode else "English Method (Allopathy)",
                chief_complaint=s.summary.chief_complaint if s.summary else "Routine consultation",
                hpi=s.summary.hpi if s.summary else None,
                past_medical_surgical=s.summary.past_medical_surgical if s.summary else None,
                medication_history=s.summary.medication_history if s.summary else None,
                allergy_history=s.summary.allergy_history if s.summary else None,
                ayush_assessment=s.summary.ayush_assessment if s.summary else None,
                doctor_notes=s.summary.doctor_notes if s.summary else None,
                doctor_verified=s.summary.doctor_verified if s.summary else False,
                documents=docs_summary
            )
        )

    # 5. Section C & D: Prescriptions
    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )

    current_rx = None
    prescription_history = []

    for rx in prescriptions:
        formatted = format_prescription_response(rx, current_user)
        if rx.status == "ACTIVE" and current_rx is None:
            current_rx = formatted
        else:
            formatted.can_edit = False
            prescription_history.append(formatted)

    # 6. Section E: Uploaded Medical Reports
    reports = (
        db.query(PatientMedicalReport)
        .filter(PatientMedicalReport.patient_id == patient_id)
        .order_by(PatientMedicalReport.created_at.desc())
        .all()
    )
    formatted_reports = [format_report_response(r) for r in reports]

    return PatientMedicalRecordResponse(
        patient_info=patient_info,
        past_medical_history=past_medical_history,
        current_prescription=current_rx,
        prescription_history=prescription_history,
        medical_reports=formatted_reports
    )

@router.put("/{patient_id}/profile", response_model=PatientResponse)
def update_patient_profile(
    patient_id: int,
    payload: PatientProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates allowed personal profile details for a patient.
    - If user is PATIENT: Can only update their own profile.
    - If user is DOCTOR: Can update patient contact/profile notes.
    """
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot edit another patient's profile."
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    if payload.email is not None:
        patient.email = payload.email.strip()
    if payload.blood_group is not None:
        patient.blood_group = payload.blood_group.strip()
    if payload.address is not None:
        patient.address = payload.address.strip()
    if payload.emergency_contact is not None:
        patient.emergency_contact = payload.emergency_contact.strip()
    if payload.preferred_language is not None:
        patient.preferred_language = payload.preferred_language.strip()

    db.commit()
    db.refresh(patient)
    return patient

# ----------------- PATIENT MEDICAL REPORT ENDPOINTS -----------------

ALLOWED_REPORT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_REPORT_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/{patient_id}/reports", response_model=PatientReportResponse)
async def upload_patient_report(
    patient_id: int,
    file: UploadFile = File(...),
    report_name: str = Form(...),
    report_type: str = Form("OTHER"),
    report_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a patient medical report (PDF, JPG, PNG <= 10MB).
    Access Control:
    - PATIENT: Can only upload to their own record.
    - DOCTOR: Can upload to any patient's record.
    """
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot upload reports to another patient's profile."
        )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    original_filename = file.filename or "uploaded_report"
    _, ext = os.path.splitext(original_filename)
    ext_lower = ext.lower()
    if ext_lower not in ALLOWED_REPORT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, JPG, JPEG, PNG."
        )

    content = await file.read()
    if len(content) > MAX_REPORT_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10MB (size: {len(content) / (1024*1024):.1f}MB)."
        )

    patient_dir = os.path.join(UPLOAD_REPORTS_DIR, str(patient_id))
    os.makedirs(patient_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex[:12]}_{original_filename.replace(' ', '_')}"
    saved_path = os.path.join(patient_dir, safe_name)
    with open(saved_path, "wb") as f:
        f.write(content)

    mime_type = file.content_type or mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

    report_record = PatientMedicalReport(
        patient_id=patient.id,
        report_name=report_name.strip() if report_name and report_name.strip() else original_filename,
        report_type=report_type.strip() if report_type else "OTHER",
        report_date=report_date.strip() if report_date else datetime.date.today().isoformat(),
        description=description.strip() if description else None,
        file_name=original_filename,
        file_path=saved_path,
        file_size_bytes=len(content),
        mime_type=mime_type
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "REPORT_UPLOADED",
        "patient_medical_report",
        str(report_record.id),
        f"Uploaded medical report '{report_record.report_name}' ({report_record.report_type}) for patient #{patient_id}."
    )

    return format_report_response(report_record)


@router.get("/{patient_id}/reports", response_model=List[PatientReportResponse])
def get_patient_reports(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all uploaded medical reports for a patient.
    Access Control:
    - PATIENT: Can only view their own reports.
    - DOCTOR: Can view reports of any patient.
    """
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot access another patient's medical reports."
        )

    if current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before viewing their medical reports."
            )

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    reports = (
        db.query(PatientMedicalReport)
        .filter(PatientMedicalReport.patient_id == patient_id)
        .order_by(PatientMedicalReport.created_at.desc())
        .all()
    )
    return [format_report_response(r) for r in reports]


@router.get("/{patient_id}/reports/{report_id}/view")
def view_patient_report(
    patient_id: int,
    report_id: int,
    current_user: User = Depends(get_user_from_token_or_query),
    db: Session = Depends(get_db)
):
    """
    Streams the medical report inline for viewing/previewing in iframe or img tags.
    """
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot view another patient's report."
        )

    if current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before viewing their medical reports."
            )

    rep = db.query(PatientMedicalReport).filter(
        PatientMedicalReport.id == report_id,
        PatientMedicalReport.patient_id == patient_id
    ).first()

    if not rep:
        raise HTTPException(status_code=404, detail="Medical report not found.")

    if not os.path.exists(rep.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on server storage.")

    media_type = rep.mime_type or "application/octet-stream"
    return FileResponse(
        rep.file_path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{rep.file_name}"'}
    )


@router.get("/{patient_id}/reports/{report_id}/download")
def download_patient_report(
    patient_id: int,
    report_id: int,
    current_user: User = Depends(get_user_from_token_or_query),
    db: Session = Depends(get_db)
):
    """
    Streams the medical report as an attachment for downloading.
    """
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot download another patient's report."
        )

    if current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before downloading their medical reports."
            )

    rep = db.query(PatientMedicalReport).filter(
        PatientMedicalReport.id == report_id,
        PatientMedicalReport.patient_id == patient_id
    ).first()

    if not rep:
        raise HTTPException(status_code=404, detail="Medical report not found.")

    if not os.path.exists(rep.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on server storage.")

    media_type = rep.mime_type or "application/octet-stream"
    return FileResponse(
        rep.file_path,
        media_type=media_type,
        filename=rep.file_name
    )


@router.delete("/{patient_id}/reports/{report_id}")
def delete_patient_report(
    patient_id: int,
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes an uploaded report (only if owned by the patient or by doctor).
    """
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot delete another patient's report."
        )

    rep = db.query(PatientMedicalReport).filter(
        PatientMedicalReport.id == report_id,
        PatientMedicalReport.patient_id == patient_id
    ).first()

    if not rep:
        raise HTTPException(status_code=404, detail="Medical report not found.")

    if os.path.exists(rep.file_path):
        try:
            os.remove(rep.file_path)
        except Exception:
            pass

    db.delete(rep)
    db.commit()

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "REPORT_DELETED",
        "patient_medical_report",
        str(report_id),
        f"Deleted report #{report_id} for patient #{patient_id}."
    )

    return {"status": "success", "message": "Report deleted successfully."}

# ----------------- COMPATIBILITY ENDPOINTS -----------------

@router.post("/register", response_model=PatientResponse)
def register_patient_legacy(payload: PatientCreate, db: Session = Depends(get_db)):
    if payload.abha_id:
        existing = db.query(Patient).filter(Patient.abha_id == payload.abha_id).first()
        if existing:
            return existing

    existing_phone = db.query(Patient).filter(Patient.phone == payload.phone).first()
    if existing_phone:
        return existing_phone

    new_patient = Patient(
        name=payload.name,
        dob=payload.dob,
        age=payload.age,
        gender=payload.gender,
        phone=payload.phone,
        email=payload.email,
        blood_group=payload.blood_group,
        address=payload.address,
        emergency_contact=payload.emergency_contact,
        preferred_language=payload.preferred_language,
        abha_id=payload.abha_id
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.post("/login", response_model=PatientResponse)
def patient_login_legacy(payload: PatientLoginRequest, db: Session = Depends(get_db)):
    if payload.abha_id and payload.abha_id.strip():
        patient = db.query(Patient).filter(Patient.abha_id == payload.abha_id.strip()).first()
        if patient:
            return patient
    if payload.phone and payload.phone.strip():
        patient = db.query(Patient).filter(Patient.phone == payload.phone.strip()).first()
        if patient:
            return patient
    raise HTTPException(status_code=404, detail="Patient not found. Please register as a new patient.")

@router.get("/lookup", response_model=Optional[PatientResponse])
def lookup_patient(phone: Optional[str] = None, abha_id: Optional[str] = None, db: Session = Depends(get_db)):
    if abha_id:
        patient = db.query(Patient).filter(Patient.abha_id == abha_id).first()
        if patient:
            return patient
    if phone:
        patient = db.query(Patient).filter(Patient.phone == phone).first()
        if patient:
            return patient
    raise HTTPException(status_code=404, detail="Patient record not found")

@router.get("/list", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    return db.query(Patient).order_by(Patient.id.desc()).limit(20).all()

@router.get("/{patient_id}/history")
def get_patient_history(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    sessions = (
        db.query(KioskSession)
        .filter(KioskSession.patient_id == patient_id)
        .order_by(KioskSession.created_at.desc())
        .all()
    )

    history_records = []
    for s in sessions:
        summary_data = None
        if s.summary:
            summary_data = {
                "id": s.summary.id,
                "chief_complaint": s.summary.chief_complaint,
                "hpi": s.summary.hpi,
                "past_medical_surgical": s.summary.past_medical_surgical,
                "medication_history": s.summary.medication_history,
                "allergy_history": s.summary.allergy_history,
                "family_history": s.summary.family_history,
                "personal_history": s.summary.personal_history,
                "ayush_assessment": s.summary.ayush_assessment,
                "review_of_systems": s.summary.review_of_systems,
                "previous_investigations": s.summary.previous_investigations,
                "missing_or_uncertain_info": s.summary.missing_or_uncertain_info,
                "doctor_verified": s.summary.doctor_verified,
                "doctor_notes": s.summary.doctor_notes,
                "verified_by_doctor_id": s.summary.verified_by_doctor_id,
                "created_at": s.summary.created_at.isoformat() if s.summary.created_at else None,
            }

        docs_data = [
            {
                "id": d.id,
                "file_name": d.file_name,
                "doc_type": d.doc_type,
                "ocr_confidence": d.ocr_confidence,
                "extracted_entities": d.extracted_entities,
                "patient_verified": d.patient_verified,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in s.documents
        ]

        chat_entries = [
            {
                "id": e.id,
                "section": e.section,
                "question": e.question,
                "response": e.response,
                "input_type": e.input_type,
                "ayush_category": e.ayush_category,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in s.history_entries
        ]

        history_records.append({
            "session_id": s.id,
            "session_token": s.session_token,
            "language": s.language,
            "ayush_mode": s.ayush_mode,
            "status": s.status,
            "emergency_flagged": s.emergency_flagged,
            "emergency_details": s.emergency_details,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "summary": summary_data,
            "documents": docs_data,
            "history_entries": chat_entries,
        })

    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "emergency_contact": patient.emergency_contact,
            "preferred_language": patient.preferred_language,
            "abha_id": patient.abha_id,
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
        },
        "history": history_records
    }
