import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import KioskSession, Patient, ClinicalHistoryEntry, EmergencyAlert, User
from app.schemas import (
    KioskSessionCreate,
    KioskSessionConsentUpdate,
    KioskSessionResponse,
    HistoryChatRequest,
    HistoryChatResponse,
    HistoryEntryResponse
)
from app.services.auth_service import (
    get_current_user,
    check_doctor_patient_access,
    log_audit
)
from app.services.ai_service import process_chat_turn, DEFAULT_QUESTIONS
from app.services.speech_service import get_tts_prompt

router = APIRouter(prefix="/history", tags=["Conversational History"])

def verify_session_access(session: KioskSession, current_user: User, db: Session):
    """Verifies that the current user has authorized access to this kiosk session."""
    if current_user.role == "PATIENT":
        if current_user.patient_id != session.patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot access another patient's clinical session."
            )
    elif current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, session.patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before accessing clinical history."
            )
    elif current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Unauthorized role for clinical history."
        )

@router.post("/start-session", response_model=KioskSessionResponse)
def start_kiosk_session(
    payload: KioskSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Access Authorization Check
    if current_user.role == "PATIENT":
        if current_user.patient_id != payload.patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot start a session for another patient."
            )
    elif current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, payload.patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before initiating clinical session."
            )
    elif current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied.")

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

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "SESSION_START",
        "kiosk_session",
        str(new_session.id),
        f"Started clinical intake session {new_session.session_token} for patient #{patient.id}."
    )

    return new_session

@router.put("/session/{session_id}/consent", response_model=KioskSessionResponse)
def update_session_consent(
    session_id: int,
    payload: KioskSessionConsentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_access(session, current_user, db)

    session.consent_given = payload.consent_given
    session.consent_timestamp = datetime.datetime.utcnow()
    db.commit()
    db.refresh(session)

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "SESSION_CONSENT",
        "kiosk_session",
        str(session.id),
        f"Updated consent state to {payload.consent_given} for session #{session.id}."
    )

    return session

@router.post("/chat", response_model=HistoryChatResponse)
def handle_chat_turn(
    payload: HistoryChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_access(session, current_user, db)

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

        log_audit(
            db,
            current_user.id,
            current_user.role,
            "EMERGENCY_TRIGGERED",
            "emergency_alert",
            str(alert.id),
            f"Emergency alert triggered for symptom '{warning_symptom}'."
        )

    return HistoryChatResponse(**chat_result)

@router.get("/session/{session_id}/entries", response_model=List[HistoryEntryResponse])
def get_session_history_entries(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(KioskSession).filter(KioskSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    verify_session_access(session, current_user, db)

    log_audit(
        db,
        current_user.id,
        current_user.role,
        "HISTORY_VIEWED",
        "kiosk_session",
        str(session.id),
        f"Viewed {len(session.history_entries)} history entries for session #{session.id}."
    )

    return session.history_entries
