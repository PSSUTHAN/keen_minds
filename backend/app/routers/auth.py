from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import datetime
from app.database import get_db
from app.models import Doctor, Patient, User
from app.schemas import (
    DoctorLoginRequest,
    DoctorResponse,
    DoctorRegisterVerifyRequest,
    SendOTPRequest,
    SendOTPResponse,
    PatientRegisterVerifyRequest,
    VerifyOTPLoginRequest,
    AuthTokenResponse
)
from app.services.auth_service import (
    sanitize_phone,
    send_otp_for_phone,
    verify_otp_for_phone,
    create_access_token,
    get_current_user,
    log_audit
)

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

# ----------------- PATIENT AUTHENTICATION -----------------

@router.post("/patient/send-otp", response_model=SendOTPResponse)
def patient_send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    """
    Sends a 6-digit OTP to the patient's mobile number.
    - If LOGIN: Validates that patient exists.
    - If REGISTER: Allows new registrations or profile updates.
    """
    phone = sanitize_phone(payload.phone)
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")

    existing_patient = db.query(Patient).filter(Patient.phone == phone).first()

    if payload.purpose.upper() == "LOGIN":
        if not existing_patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mobile number not registered. Please switch to 'New Patient Registration' to create an account."
            )

    otp_code, cooldown = send_otp_for_phone(phone, payload.purpose.upper(), "PATIENT", db)

    return SendOTPResponse(
        success=True,
        message=f"OTP sent successfully to +91 {phone}",
        phone=phone,
        cooldown_seconds=cooldown
    )

@router.post("/patient/verify-register", response_model=AuthTokenResponse)
def patient_verify_and_register(payload: PatientRegisterVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies OTP and creates or updates patient record with full demographic & medical profile.
    Issues secure JWT token with role 'PATIENT'.
    """
    phone = sanitize_phone(payload.phone)
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number format.")

    # 1. Verify OTP
    verify_otp_for_phone(phone, payload.otp, "REGISTER", db, role="PATIENT")

    # 2. Calculate Age from DOB if provided
    calculated_age = 45
    if payload.dob:
        try:
            birth_date = datetime.datetime.strptime(payload.dob, "%Y-%m-%d")
            today = datetime.datetime.today()
            calculated_age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        except Exception:
            calculated_age = 45

    # 3. Create or Update Patient Record
    existing_patient = db.query(Patient).filter(Patient.phone == phone).first()
    if existing_patient:
        existing_patient.name = payload.full_name.strip()
        existing_patient.dob = payload.dob
        existing_patient.age = calculated_age
        existing_patient.gender = payload.gender
        if payload.email:
            existing_patient.email = payload.email.strip()
        if payload.blood_group:
            existing_patient.blood_group = payload.blood_group
        if payload.address:
            existing_patient.address = payload.address.strip()
        if payload.emergency_contact:
            existing_patient.emergency_contact = payload.emergency_contact.strip()
        if payload.preferred_language:
            existing_patient.preferred_language = payload.preferred_language
        if payload.abha_id:
            existing_patient.abha_id = payload.abha_id.strip()
        existing_patient.status = "ACTIVE"
        existing_patient.mobile_verified = True
        db.commit()
        db.refresh(existing_patient)
        patient_record = existing_patient
    else:
        new_patient = Patient(
            name=payload.full_name.strip(),
            dob=payload.dob,
            age=calculated_age,
            gender=payload.gender,
            phone=phone,
            email=payload.email.strip() if payload.email else None,
            blood_group=payload.blood_group,
            address=payload.address.strip() if payload.address else None,
            emergency_contact=payload.emergency_contact.strip() if payload.emergency_contact else None,
            preferred_language=payload.preferred_language or "en",
            abha_id=payload.abha_id.strip() if payload.abha_id else None,
            status="ACTIVE",
            mobile_verified=True
        )
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)
        patient_record = new_patient

    # 4. Create or Ensure User Record for RBAC
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            email=patient_record.email,
            role="PATIENT",
            patient_id=patient_record.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.role = "PATIENT"
        user.patient_id = patient_record.id
        db.commit()

    # 5. Generate JWT Token
    token_payload = {
        "user_id": user.id,
        "patient_id": patient_record.id,
        "role": "PATIENT",
        "name": patient_record.name,
        "phone": phone
    }
    access_token = create_access_token(token_payload)

    # 6. Audit Log
    log_audit(db, user.id, "PATIENT", "PATIENT_REGISTER", "patient", str(patient_record.id), f"Patient {patient_record.name} verified & registered.")

    return AuthTokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="PATIENT",
        user_id=user.id,
        patient_id=patient_record.id,
        name=patient_record.name,
        phone=phone,
        user_data={
            "id": patient_record.id,
            "name": patient_record.name,
            "age": patient_record.age,
            "gender": patient_record.gender,
            "dob": patient_record.dob,
            "blood_group": patient_record.blood_group,
            "phone": patient_record.phone,
            "email": patient_record.email,
            "address": patient_record.address,
            "emergency_contact": patient_record.emergency_contact,
            "abha_id": patient_record.abha_id,
            "preferred_language": patient_record.preferred_language
        }
    )

@router.post("/patient/verify-login", response_model=AuthTokenResponse)
def patient_verify_and_login(payload: VerifyOTPLoginRequest, db: Session = Depends(get_db)):
    """
    Verifies OTP for registered patient mobile number.
    Authenticates and issues JWT token with role 'PATIENT'.
    """
    phone = sanitize_phone(payload.phone)

    # 1. Verify OTP
    verify_otp_for_phone(phone, payload.otp, "LOGIN", db, role="PATIENT")

    # 2. Fetch Patient
    patient = db.query(Patient).filter(Patient.phone == phone).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient account not found for this mobile number."
        )

    # 3. Ensure User record exists
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            email=patient.email,
            role="PATIENT",
            patient_id=patient.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.role != "PATIENT":
        user.role = "PATIENT"
        user.patient_id = patient.id
        db.commit()

    # 4. Generate JWT
    token_payload = {
        "user_id": user.id,
        "patient_id": patient.id,
        "role": "PATIENT",
        "name": patient.name,
        "phone": phone
    }
    access_token = create_access_token(token_payload)

    # 5. Audit Log
    log_audit(db, user.id, "PATIENT", "PATIENT_LOGIN", "patient", str(patient.id), f"Patient {patient.name} logged in via OTP.")

    return AuthTokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="PATIENT",
        user_id=user.id,
        patient_id=patient.id,
        name=patient.name,
        phone=phone,
        user_data={
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "dob": patient.dob,
            "blood_group": patient.blood_group,
            "phone": patient.phone,
            "email": patient.email,
            "address": patient.address,
            "emergency_contact": patient.emergency_contact,
            "abha_id": patient.abha_id,
            "preferred_language": patient.preferred_language
        }
    )

# ----------------- DOCTOR AUTHENTICATION -----------------

@router.post("/doctor/send-otp", response_model=SendOTPResponse)
def doctor_send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    """
    Sends OTP to doctor mobile number.
    - If LOGIN: Strictly checks that doctor exists and user has role DOCTOR.
      If not found: raises 404 with detail 'Doctor account not found.' (and does NOT send OTP).
    - If REGISTER: Checks that mobile number is not already registered.
    """
    phone = sanitize_phone(payload.phone)
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit doctor mobile number.")

    purpose = (payload.purpose or "LOGIN").upper()
    doctor = db.query(Doctor).filter(Doctor.phone == phone).first()

    if purpose == "LOGIN":
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor account not found."
            )
        user = db.query(User).filter(User.phone == phone).first()
        if user and user.role != "DOCTOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account does not have authorized DOCTOR role."
            )
    elif purpose == "REGISTER":
        if doctor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A doctor account with this mobile number already exists. Please log in."
            )

    otp_code, cooldown = send_otp_for_phone(phone, purpose, "DOCTOR", db)

    return SendOTPResponse(
        success=True,
        message=f"Doctor OTP sent successfully to +91 {phone}",
        phone=phone,
        cooldown_seconds=cooldown
    )

@router.post("/doctor/verify-register", response_model=AuthTokenResponse)
def doctor_verify_and_register(payload: DoctorRegisterVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies OTP and creates Doctor record and User record with secure DOCTOR role.
    """
    phone = sanitize_phone(payload.phone)
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid doctor mobile number format.")

    # 1. Verify OTP
    verify_otp_for_phone(phone, payload.otp, "REGISTER", db, role="DOCTOR")

    # 2. Check uniqueness
    if db.query(Doctor).filter(Doctor.phone == phone).first():
        raise HTTPException(status_code=400, detail="Mobile number is already registered.")

    reg_no = payload.registration_no.strip()
    if db.query(Doctor).filter(Doctor.registration_no == reg_no).first():
        raise HTTPException(status_code=400, detail="Medical Registration Number is already registered.")

    if payload.email and payload.email.strip():
        if db.query(Doctor).filter(Doctor.email == payload.email.strip()).first():
            raise HTTPException(status_code=400, detail="Email address is already registered.")

    # 3. Create Doctor Record
    doc_name = payload.name.strip()
    if not doc_name.lower().startswith("dr.") and not doc_name.lower().startswith("dr "):
        doc_name = f"Dr. {doc_name}"

    new_doc = Doctor(
        name=doc_name,
        specialty=payload.specialty.strip(),
        registration_no=reg_no,
        phone=phone,
        email=payload.email.strip() if payload.email else None,
        qualification=payload.qualification.strip(),
        experience_years=payload.experience_years or 0,
        hospital_name=payload.hospital_name.strip() if payload.hospital_name else "MediKiosk OPD",
        department=payload.department.strip() if payload.department else "OPD Medicine"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 4. Create User Record with strict DOCTOR role
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            email=new_doc.email,
            role="DOCTOR",
            doctor_id=new_doc.id,
            is_active=True
        )
        db.add(user)
    else:
        user.role = "DOCTOR"
        user.doctor_id = new_doc.id
    db.commit()
    db.refresh(user)

    # 5. Generate JWT Token
    token_payload = {
        "user_id": user.id,
        "doctor_id": new_doc.id,
        "role": "DOCTOR",
        "name": new_doc.name,
        "phone": phone
    }
    access_token = create_access_token(token_payload)

    # 6. Audit Log
    log_audit(db, user.id, "DOCTOR", "DOCTOR_REGISTER", "doctor", str(new_doc.id), f"Doctor {new_doc.name} registered and verified.")

    return AuthTokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="DOCTOR",
        user_id=user.id,
        doctor_id=new_doc.id,
        name=new_doc.name,
        phone=phone,
        user_data={
            "id": new_doc.id,
            "name": new_doc.name,
            "specialty": new_doc.specialty,
            "qualification": new_doc.qualification,
            "department": new_doc.department,
            "registration_no": new_doc.registration_no,
            "phone": new_doc.phone,
            "email": new_doc.email,
            "hospital_name": new_doc.hospital_name,
            "experience_years": new_doc.experience_years
        }
    )

@router.post("/doctor/verify-login", response_model=AuthTokenResponse)
def doctor_verify_and_login(payload: VerifyOTPLoginRequest, db: Session = Depends(get_db)):
    """
    Verifies OTP for doctor, verifies DOCTOR role in database, and issues doctor JWT.
    """
    phone = sanitize_phone(payload.phone)

    # 1. Verify OTP
    verify_otp_for_phone(phone, payload.otp, "LOGIN", db, role="DOCTOR")

    # 2. Verify Doctor entity from DB
    doctor = db.query(Doctor).filter(Doctor.phone == phone).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Mobile number does not correspond to an authorized Doctor profile."
        )

    # 3. Ensure User entity exists with role DOCTOR
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            email=doctor.email,
            role="DOCTOR",
            doctor_id=doctor.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Strictly enforce DOCTOR role in User entity
        user.role = "DOCTOR"
        user.doctor_id = doctor.id
        db.commit()

    # 4. Generate JWT with DOCTOR role
    token_payload = {
        "user_id": user.id,
        "doctor_id": doctor.id,
        "role": "DOCTOR",
        "name": doctor.name,
        "phone": phone
    }
    access_token = create_access_token(token_payload)

    # 5. Audit Log
    log_audit(db, user.id, "DOCTOR", "DOCTOR_LOGIN", "doctor", str(doctor.id), f"Dr. {doctor.name} logged in via OTP.")

    return AuthTokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="DOCTOR",
        user_id=user.id,
        doctor_id=doctor.id,
        name=doctor.name,
        phone=phone,
        user_data={
            "id": doctor.id,
            "name": doctor.name,
            "specialty": doctor.specialty,
            "department": doctor.department,
            "registration_no": doctor.registration_no,
            "phone": doctor.phone,
            "email": doctor.email
        }
    )

# ----------------- CURRENT USER INFO -----------------

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns the currently authenticated user profile based on role.
    """
    if current_user.role == "DOCTOR":
        doctor = db.query(Doctor).filter(Doctor.id == current_user.doctor_id).first()
        return {
            "role": "DOCTOR",
            "user_id": current_user.id,
            "doctor": doctor
        }
    elif current_user.role == "PATIENT":
        patient = db.query(Patient).filter(Patient.id == current_user.patient_id).first()
        return {
            "role": "PATIENT",
            "user_id": current_user.id,
            "patient": patient
        }
    return {
        "role": current_user.role,
        "user_id": current_user.id,
        "phone": current_user.phone
    }

# ----------------- LEGACY DOCTOR LOGIN (PIN) -----------------

@router.post("/doctor-login", response_model=DoctorResponse)
def doctor_login_legacy(payload: DoctorLoginRequest, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.registration_no == payload.registration_no).first()
    if not doctor or doctor.pin != payload.pin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Registration Number or PIN"
        )
    return doctor
