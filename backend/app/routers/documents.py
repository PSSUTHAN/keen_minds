from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import KioskSession, UploadedDocument
from app.schemas import DocumentUploadResponse, DocumentVerifyRequest
from app.services.ocr_service import process_document_ocr

router = APIRouter(prefix="/documents", tags=["Medical Document Digitization"])

@router.post("/upload/{session_id}", response_model=DocumentUploadResponse)
async def upload_medical_document(
    session_id: int,
    doc_type: str = Form("prescription"), # prescription, lab_report, discharge_summary
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
    return new_doc

@router.put("/document/{doc_id}/verify", response_model=DocumentUploadResponse)
def verify_document_entities(
    doc_id: int,
    payload: DocumentVerifyRequest,
    db: Session = Depends(get_db)
):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.extracted_entities = payload.extracted_entities.model_dump()
    doc.patient_verified = payload.patient_verified
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/session/{session_id}", response_model=List[DocumentUploadResponse])
def get_session_documents(session_id: int, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.documents
