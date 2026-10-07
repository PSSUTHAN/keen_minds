from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ClinicalSummary
from app.services.fhir_service import push_to_mock_his

router = APIRouter(prefix="/fhir", tags=["FHIR & ABDM Integration"])

@router.get("/export/{session_id}")
def export_fhir_bundle(session_id: int, db: Session = Depends(get_db)):
    summary = db.query(ClinicalSummary).filter(ClinicalSummary.session_id == session_id).first()
    if not summary or not summary.fhir_bundle:
        raise HTTPException(status_code=404, detail="FHIR Bundle not generated for this session")
    return summary.fhir_bundle

@router.post("/push-his/{session_id}")
def push_summary_to_his(session_id: int, db: Session = Depends(get_db)):
    summary = db.query(ClinicalSummary).filter(ClinicalSummary.session_id == session_id).first()
    if not summary or not summary.fhir_bundle:
        raise HTTPException(status_code=404, detail="FHIR Bundle not found for session")

    his_response = push_to_mock_his(summary.fhir_bundle)
    return his_response
