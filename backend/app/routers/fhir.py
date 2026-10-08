from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ClinicalSummary, KioskSession, User
from app.services.fhir_service import push_to_mock_his
from app.services.auth_service import (
    get_current_user,
    require_role,
    check_doctor_patient_access,
    log_audit
)

router = APIRouter(prefix="/fhir", tags=["FHIR & ABDM Integration"])

@router.get("/export/{session_id}")
def export_fhir_bundle(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if current_user.role == "PATIENT":
        if current_user.patient_id != session.patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    elif current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, session.patient_id, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied")
    elif current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied")

    summary = db.query(ClinicalSummary).filter(ClinicalSummary.session_id == session_id).first()
    if not summary or not summary.fhir_bundle:
        raise HTTPException(status_code=404, detail="FHIR Bundle not generated for this session")

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "FHIR_EXPORT",
        "clinical_summary",
        str(summary.id),
        f"Exported FHIR bundle for session #{session_id}."
    )

    return summary.fhir_bundle

@router.post("/push-his/{session_id}")
def push_summary_to_his(
    session_id: int,
    current_user: User = Depends(require_role(["DOCTOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, session.patient_id, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied")

    summary = db.query(ClinicalSummary).filter(ClinicalSummary.session_id == session_id).first()
    if not summary or not summary.fhir_bundle:
        raise HTTPException(status_code=404, detail="FHIR Bundle not found for session")

    his_response = push_to_mock_his(summary.fhir_bundle)

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "FHIR_HIS_PUSH",
        "clinical_summary",
        str(summary.id),
        f"Pushed FHIR clinical summary to Hospital Information System (HIS)."
    )

    return his_response
