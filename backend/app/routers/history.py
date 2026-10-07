import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import KioskSession, Patient, ClinicalHistoryEntry, EmergencyAlert
from app.schemas import (
    KioskSessionCreate,
    KioskSessionConsentUpdate,
    KioskSessionResponse,
    HistoryChatRequest,
    HistoryChatResponse,
    HistoryEntryResponse
)
from app.services.ai_service import process_chat_turn, DEFAULT_QUESTIONS
from app.services.speech_service import get_tts_prompt

router = APIRouter(prefix="/history", tags=["Conversational History"])

@router.post("/start-session", response_model=KioskSessionResponse)
def start_kiosk_session(payload: KioskSessionCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    session_token = f"KIOSK-{uuid.uuid4().hex[:6].upper()}"
    new_session = KioskSession(
        patient_id=patient.id,
        session_token=session_token,
        language=payload.language,
        ayush_mode=payload.ayush_mode,
        status="in_progress"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.put("/session/{session_id}/consent", response_model=KioskSessionResponse)
def update_session_consent(session_id: int, payload: KioskSessionConsentUpdate, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.consent_given = payload.consent_given
    session.consent_timestamp = datetime.datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session

@router.post("/chat", response_model=HistoryChatResponse)
def handle_chat_turn(payload: HistoryChatRequest, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Fetch history entries so far
    history_so_far = [
        {
            "section": entry.section,
            "question": entry.question,
            "response": entry.response,
            "ayush_category": entry.ayush_category
        }
        for entry in session.history_entries
    ]

    # Save user response
    if payload.user_input and payload.user_input.strip():
        # Get current question text or fallback
        prev_q = "Please state your symptom or response"
        if history_so_far:
            prev_q = history_so_far[-1]["question"]
        else:
            lang_qs = DEFAULT_QUESTIONS.get(session.language, DEFAULT_QUESTIONS["en"])
            prev_q = lang_qs.get(payload.section, DEFAULT_QUESTIONS["en"]["chief_complaint"])

        new_entry = ClinicalHistoryEntry(
            session_id=session.id,
            section=payload.section,
            question=prev_q,
            response=payload.user_input,
            input_type=payload.input_type,
            ayush_category=payload.ayush_category
        )
        db.add(new_entry)
        db.commit()
        
        # Add to history list for processing
        history_so_far.append({
            "section": payload.section,
            "question": prev_q,
            "response": payload.user_input,
            "ayush_category": payload.ayush_category
        })

    # Process AI turn & Emergency check
    chat_result, is_emergency, warning_symptom, severity = process_chat_turn(
        user_input=payload.user_input,
        current_section=payload.section,
        lang=session.language,
        history_so_far=history_so_far,
        ayush_mode=session.ayush_mode
    )

    if is_emergency and warning_symptom:
        # Flag session as emergency & log alert
        session.emergency_flagged = True
        session.emergency_details = warning_symptom
        
        alert = EmergencyAlert(
            session_id=session.id,
            patient_id=session.patient_id,
            warning_symptom=warning_symptom,
            severity=severity or "CRITICAL",
            details=f"Patient reported: '{payload.user_input}' during section '{payload.section}'"
        )
        db.add(alert)
        db.commit()

    return HistoryChatResponse(**chat_result)

@router.get("/session/{session_id}/entries", response_model=List[HistoryEntryResponse])
def get_session_history_entries(session_id: int, db: Session = Depends(get_db)):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.history_entries
