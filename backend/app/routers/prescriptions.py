import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Prescription, PrescriptionItem, Patient, Doctor, User
from app.schemas import (
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionResponse,
    PatientPrescriptionsOverview,
    PrescriptionItemCreate,
    PrescriptionItemResponse,
    DoctorBriefResponse
)
from app.services.auth_service import (
    get_current_user,
    require_role,
    log_audit,
    check_doctor_patient_access
)

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions & Medication Management"])

def process_prescription_item_data(item: PrescriptionItemCreate, rx_id: int) -> PrescriptionItem:
    """Validates and constructs a PrescriptionItem with structured timing and dosage."""
    name = (item.medicine_name or "").strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Medicine name is required for all prescribed medications."
        )

    # Timing doses
    m = int(item.morning_dose if item.morning_dose is not None else 0)
    a = int(item.afternoon_dose if item.afternoon_dose is not None else 0)
    n = int(item.night_dose if item.night_dose is not None else 0)

    if m < 0 or a < 0 or n < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dose values cannot be negative for '{name}'."
        )

    # Validation: At least one timing slot must be > 0 (0-0-0 is rejected)
    if m == 0 and a == 0 and n == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please specify at least one medicine timing for '{name}'. (0-0-0 is not allowed)"
        )

    timing_code = item.timing_code or f"{m}-{a}-{n}"
    
    # Calculate frequency
    slots = sum(1 for d in [m, a, n] if d > 0)
    if slots == 1:
        auto_freq = "Once daily"
    elif slots == 2:
        auto_freq = "Twice daily"
    elif slots == 3:
        auto_freq = "Three times daily"
    else:
        auto_freq = f"{slots} times daily"

    frequency = item.frequency or auto_freq
    unit = (item.dosage_unit or "Tablet").strip()
    
    max_dose = max(m, a, n)
    amt = item.dosage_amount if item.dosage_amount is not None else float(max_dose or 1)
    amt_display = int(amt) if amt.is_integer() else amt
    unit_display = f"{unit}s" if amt > 1 and not unit.endswith("s") and unit.lower() in ["tablet", "capsule", "spoon", "drop", "puff"] else unit
    dosage_str = item.dosage or f"{amt_display} {unit_display}"

    duration = (item.duration or "").strip()
    if not duration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duration is required for medication '{name}'."
        )

    return PrescriptionItem(
        prescription_id=rx_id,
        medicine_name=name,
        strength=item.strength.strip() if item.strength else None,
        dosage=dosage_str,
        dosage_amount=amt,
        dosage_unit=unit,
        morning_dose=m,
        afternoon_dose=a,
        night_dose=n,
        timing_code=timing_code,
        frequency=frequency,
        duration=duration,
        instructions=item.instructions.strip() if item.instructions else None
    )

def format_prescription_response(rx: Prescription, current_user: User) -> PrescriptionResponse:
    """Helper to build PrescriptionResponse with doctor brief, dynamic can_edit flag, and structured timing."""
    doc_brief = None
    if rx.doctor:
        doc_brief = DoctorBriefResponse(
            id=rx.doctor.id,
            name=rx.doctor.name,
            specialty=rx.doctor.specialty,
            department=rx.doctor.department,
            registration_no=rx.doctor.registration_no,
            phone=rx.doctor.phone
        )

    # Dynamic backend permission check: ONLY active prescription AND creating doctor can edit
    can_edit = (
        current_user.role == "DOCTOR"
        and rx.status == "ACTIVE"
        and rx.doctor_id == current_user.doctor_id
    )

    items_resp = []
    for item in rx.items:
        m = item.morning_dose if item.morning_dose is not None else 0
        a = item.afternoon_dose if item.afternoon_dose is not None else 0
        n = item.night_dose if item.night_dose is not None else 0
        
        # Legacy fallback if m, a, n are 0 and no timing_code
        if m == 0 and a == 0 and n == 0 and not item.timing_code:
            freq_lower = (item.frequency or "").lower()
            if "once" in freq_lower or "od" in freq_lower:
                m, a, n = 1, 0, 0
            elif "twice" in freq_lower or "bid" in freq_lower:
                m, a, n = 1, 0, 1
            elif "thrice" in freq_lower or "three" in freq_lower or "tid" in freq_lower:
                m, a, n = 1, 1, 1
            else:
                m, a, n = 1, 0, 0

        timing_code = item.timing_code or f"{m}-{a}-{n}"
        slots = sum(1 for d in [m, a, n] if d > 0)
        auto_freq = "Once daily" if slots == 1 else "Twice daily" if slots == 2 else "Three times daily" if slots == 3 else "As directed"
        freq = item.frequency or auto_freq
        unit = item.dosage_unit or "Tablet"
        amt = item.dosage_amount if item.dosage_amount is not None else float(max(m, a, n) or 1)
        amt_display = int(amt) if amt.is_integer() else amt
        unit_display = f"{unit}s" if amt > 1 and not unit.endswith("s") and unit.lower() in ["tablet", "capsule", "spoon", "drop", "puff"] else unit
        dosage_str = item.dosage or f"{amt_display} {unit_display}"

        items_resp.append(
            PrescriptionItemResponse(
                id=item.id,
                prescription_id=item.prescription_id,
                medicine_name=item.medicine_name,
                strength=item.strength,
                dosage=dosage_str,
                dosage_amount=amt,
                dosage_unit=unit,
                morning_dose=m,
                afternoon_dose=a,
                night_dose=n,
                timing_code=timing_code,
                frequency=freq,
                duration=item.duration,
                instructions=item.instructions,
                created_at=item.created_at
            )
        )

    return PrescriptionResponse(
        id=rx.id,
        prescription_number=rx.prescription_number,
        patient_id=rx.patient_id,
        doctor_id=rx.doctor_id,
        diagnosis=rx.diagnosis,
        doctor_notes=rx.doctor_notes,
        status=rx.status,
        created_at=rx.created_at,
        updated_at=rx.updated_at,
        doctor=doc_brief,
        items=items_resp,
        can_edit=can_edit
    )

@router.get("/patient/{patient_id}", response_model=PatientPrescriptionsOverview)
def get_patient_prescriptions(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches the current active prescription and immutable prescription history for a patient.
    Strictly verifies that:
    - If user is PATIENT: Can only view their OWN prescriptions.
    - If user is DOCTOR: Can view the patient's prescriptions.
    """
    # 1. Authorization check
    if current_user.role == "PATIENT" and current_user.patient_id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not authorized to view another patient's prescriptions."
        )

    if current_user.role == "DOCTOR":
        if not check_doctor_patient_access(current_user.doctor_id, patient_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You must verify patient consent via OTP before viewing their prescriptions."
            )

    # 2. Check patient exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # 3. Query prescriptions ordered by created_at desc
    all_prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )

    current_rx = None
    history_rx_list = []

    for rx in all_prescriptions:
        formatted = format_prescription_response(rx, current_user)
        if rx.status == "ACTIVE" and current_rx is None:
            current_rx = formatted
        else:
            # All past prescriptions are strictly read-only
            formatted.can_edit = False
            history_rx_list.append(formatted)

    return PatientPrescriptionsOverview(
        current_prescription=current_rx,
        prescription_history=history_rx_list
    )

@router.post("/patient/{patient_id}", response_model=PrescriptionResponse)
def create_patient_prescription(
    patient_id: int,
    payload: PrescriptionCreate,
    current_user: User = Depends(require_role(["DOCTOR"])),
    db: Session = Depends(get_db)
):
    """
    Creates a new prescription for a patient.
    - Only DOCTOR role permitted.
    - Sets doctor_id from current_user.doctor_id (backend-enforced).
    - Archives any previously active prescription to 'COMPLETED' (ensuring immutable lifecycle).
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    doctor = db.query(Doctor).filter(Doctor.id == current_user.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    # 1. Upfront Validation of diagnosis and items
    if not payload.diagnosis.strip():
        raise HTTPException(status_code=400, detail="Clinical diagnosis is required.")

    if not payload.items:
        raise HTTPException(status_code=400, detail="At least one prescribed medication is required.")

    for item in payload.items:
        name = (item.medicine_name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Medicine name is required for all medications.")
        m = int(item.morning_dose if item.morning_dose is not None else 0)
        a = int(item.afternoon_dose if item.afternoon_dose is not None else 0)
        n = int(item.night_dose if item.night_dose is not None else 0)
        if m < 0 or a < 0 or n < 0:
            raise HTTPException(status_code=400, detail=f"Dose values cannot be negative for '{name}'.")
        if m == 0 and a == 0 and n == 0:
            raise HTTPException(status_code=400, detail=f"Please specify at least one medicine timing for '{name}'. (0-0-0 is not allowed)")
        if not (item.duration or "").strip():
            raise HTTPException(status_code=400, detail=f"Duration is required for medication '{name}'.")

    # Lifecycle Rule: Archive previous ACTIVE prescriptions to COMPLETED
    active_prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient_id, Prescription.status == "ACTIVE")
        .all()
    )
    for old_rx in active_prescriptions:
        old_rx.status = "COMPLETED"
        old_rx.updated_at = datetime.datetime.utcnow()

    # Generate unique RX number: RX-YYYY-XXXXX
    year = datetime.datetime.utcnow().year
    rx_num = f"RX-{year}-{uuid.uuid4().hex[:5].upper()}"

    new_prescription = Prescription(
        prescription_number=rx_num,
        patient_id=patient.id,
        doctor_id=doctor.id,
        diagnosis=payload.diagnosis.strip(),
        doctor_notes=payload.doctor_notes.strip() if payload.doctor_notes else None,
        status="ACTIVE"
    )
    db.add(new_prescription)
    db.commit()
    db.refresh(new_prescription)

    # Add normalized prescription items with structured timing
    for item in payload.items:
        new_item = process_prescription_item_data(item, new_prescription.id)
        db.add(new_item)

    db.commit()
    db.refresh(new_prescription)

    # Audit Log
    log_audit(
        db,
        current_user.id,
        "DOCTOR",
        "PRESCRIPTION_CREATED",
        "prescription",
        str(new_prescription.id),
        f"Dr. {doctor.name} created prescription {rx_num} for patient #{patient.id} ({patient.name})."
    )

    return format_prescription_response(new_prescription, current_user)

@router.put("/{prescription_id}", response_model=PrescriptionResponse)
def update_prescription(
    prescription_id: int,
    payload: PrescriptionUpdate,
    current_user: User = Depends(require_role(["DOCTOR"])),
    db: Session = Depends(get_db)
):
    """
    Edits a prescription.
    CRITICAL PERMISSION RULE:
    Only the doctor who CREATED this prescription can edit it.
    If another doctor attempts to edit, returns 403 Forbidden.
    Past/completed prescriptions cannot be modified.
    """
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    # 1. Ownership Authorization Check
    if prescription.doctor_id != current_user.doctor_id:
        creator_name = prescription.doctor.name if prescription.doctor else f"Doctor ID #{prescription.doctor_id}"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Only the prescribing doctor ({creator_name}) is authorized to edit this prescription."
        )

    # 2. Lifecycle Status Check
    if prescription.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Historical prescriptions are immutable and read-only. Please create a new prescription entry instead."
        )

    # 3. Apply updates
    if payload.diagnosis is not None:
        prescription.diagnosis = payload.diagnosis.strip()
    if payload.doctor_notes is not None:
        prescription.doctor_notes = payload.doctor_notes.strip()

    if payload.items is not None:
        # Remove old items and replace with updated ones
        db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).delete()
        for item in payload.items:
            new_item = process_prescription_item_data(item, prescription.id)
            db.add(new_item)

    prescription.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(prescription)

    # Audit Log
    log_audit(
        db,
        current_user.id,
        "DOCTOR",
        "PRESCRIPTION_EDITED",
        "prescription",
        str(prescription.id),
        f"Dr. {prescription.doctor.name} updated prescription {prescription.prescription_number}."
    )

    return format_prescription_response(prescription, current_user)

@router.put("/{prescription_id}/finalize", response_model=PrescriptionResponse)
def finalize_prescription(
    prescription_id: int,
    current_user: User = Depends(require_role(["DOCTOR"])),
    db: Session = Depends(get_db)
):
    """
    Finalizes treatment / completes an active prescription, moving it to Prescription History.
    Only the prescribing doctor can finalize it.
    """
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    if prescription.doctor_id != current_user.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only the prescribing doctor can finalize this prescription."
        )

    prescription.status = "COMPLETED"
    prescription.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(prescription)

    log_audit(
        db,
        current_user.id,
        "DOCTOR",
        "PRESCRIPTION_FINALIZED",
        "prescription",
        str(prescription.id),
        f"Prescription {prescription.prescription_number} finalized."
    )

    return format_prescription_response(prescription, current_user)

