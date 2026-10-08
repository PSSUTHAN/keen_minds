from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import KioskSession, UploadedDocument, User
from app.schemas import DocumentUploadResponse, DocumentVerifyRequest
from app.services.ocr_service import process_document_ocr
from app.services.auth_service import (
    get_current_user,
    check_doctor_patient_access,
    log_audit
)

router = APIRouter(prefix="/documents", tags=["Medical Document Digitization"])

def verify_session_document_access(session: KioskSession, current_user: User, db: Session):
    """Verifies that the current user is authorized to access documents for this session."""
    if current_user.role == "PATIENT":
        if current_user.patient_id != session.patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot access documents from another patient's session."
            )
    elif current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, session.patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before viewing session documents."
            )
    elif current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied.")

@router.post("/upload/{session_id}", response_model=DocumentUploadResponse)
async def upload_medical_document(
    session_id: int,
    doc_type: str = Form("prescription"), # prescription, lab_report, discharge_summary
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_document_access(session, current_user, db)

    file_bytes = await file.read()
    
    # Process document with OCR engine & candidate entity extractor
    ocr_result = process_document_ocr(
        file_bytes=file_bytes,
        filename=file.filename or "prescription_scan.jpg",
        doc_type=doc_type
    )

    new_doc = UploadedDocument(
        session_id=session.id,
        file_name=file.filename or "uploaded_doc.jpg",
        doc_type=doc_type,
        raw_ocr_text=ocr_result["raw_ocr_text"],
        ocr_confidence=ocr_result["ocr_confidence"],
        extracted_entities=ocr_result["extracted_entities"],
        patient_verified=False
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "DOCUMENT_UPLOAD",
        "uploaded_document",
        str(new_doc.id),
        f"Uploaded and scanned document '{new_doc.file_name}' ({doc_type}) for session #{session.id}."
    )

    return new_doc

@router.put("/document/{doc_id}/verify", response_model=DocumentUploadResponse)
def verify_document_entities(
    doc_id: int,
    payload: DocumentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    session = db.query(KioskSession).filter(KioskSession.id == doc.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_document_access(session, current_user, db)

    doc.extracted_entities = payload.extracted_entities.model_dump()
    doc.patient_verified = payload.patient_verified
    db.commit()
    db.refresh(doc)

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "DOCUMENT_VERIFY",
        "uploaded_document",
        str(doc.id),
        f"Verified OCR extracted entities for document #{doc.id}."
    )

    return doc

@router.get("/session/{session_id}", response_model=List[DocumentUploadResponse])
def get_session_documents(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_document_access(session, current_user, db)

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "DOCUMENTS_VIEWED",
        "kiosk_session",
        str(session.id),
        f"Viewed {len(session.documents)} documents for session #{session.id}."
    )

    return session.documents
