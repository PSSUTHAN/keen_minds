"""
MediKiosk Authentication & Role-Based Access Control (RBAC) Service

Features:
- Cryptographically secure 6-digit OTP generation and rate-limited issuance.
- Single-use verification with 5-minute expiry and attempt tracking.
- JWT Bearer token generation and decoding.
- FastAPI dependency injection for current user & role verification (PATIENT vs DOCTOR).
- Security audit logging for compliance and tracking.
"""

import secrets
import datetime
from typing import List, Optional, Dict, Any
import jwt
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, Doctor, Patient, OTPVerification, AuditLog

security_bearer = HTTPBearer(auto_error=False)

def sanitize_phone(phone_str: str) -> str:
    """Sanitizes phone input to clean 10 digits."""
    if not phone_str:
        return ""
    cleaned = "".join(filter(str.isdigit, str(phone_str)))
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif len(cleaned) > 10:
        cleaned = cleaned[-10:]
    return cleaned

from app.services.otp_service import (
    get_otp_provider,
    hash_otp,
    verify_otp_hash,
    mask_phone_for_otp,
    normalize_otp_purpose
)

def generate_secure_otp() -> str:
    """Generates a cryptographically secure 6-digit OTP code."""
    return f"{secrets.randbelow(900000) + 100000:06d}"

def send_otp_for_phone(
    phone: str,
    purpose: str,
    role: str,
    db: Session
) -> tuple[str, int]:
    """
    Validates cooldown, generates OTP, records verification state, delivers via configured provider,
    and returns (otp_code, cooldown_seconds).
    """
    clean_phone = sanitize_phone(phone)
    if not clean_phone or len(clean_phone) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit mobile number."
        )

    # Rate limiting: Cooldown check
    last_otp = (
        db.query(OTPVerification)
        .filter(OTPVerification.phone == clean_phone, OTPVerification.purpose == purpose)
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if last_otp:
        time_elapsed = (datetime.datetime.utcnow() - last_otp.created_at).total_seconds()
        if time_elapsed < settings.OTP_COOLDOWN_SECONDS:
            remaining = int(settings.OTP_COOLDOWN_SECONDS - time_elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting a new OTP."
            )

    # Invalidate any previous unverified OTPs for this phone + purpose (Requirement 11 & 16)
    db.query(OTPVerification).filter(
        OTPVerification.phone == clean_phone,
        OTPVerification.purpose == purpose,
        OTPVerification.is_verified == False
    ).update({"is_verified": True})

    otp_code = generate_secure_otp()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    otp_hash_val = hash_otp(clean_phone, otp_code)

    new_otp = OTPVerification(
        phone=clean_phone,
        otp_code="[SECURE_HASHED]", # Satisfies schema NOT NULL constraint while ensuring plaintext OTP is never persisted
        otp_hash=otp_hash_val,
        purpose=purpose,
        role=role,
        expires_at=expires_at,
        attempts=0,
        is_verified=False
    )
    db.add(new_otp)
    db.commit()

    # Deliver OTP via configured provider abstraction (SMS/Kannel in prod, simulated in dev)
    provider = get_otp_provider()
    provider.send_otp(clean_phone, otp_code, purpose, role, expires_at)

    return otp_code, settings.OTP_COOLDOWN_SECONDS

def get_compatible_purposes(purpose: str, role: Optional[str] = None) -> list[str]:
    """Resolves purpose key to compatible stored variations."""
    p = (purpose or "").strip().upper()
    r = (role or "").strip().upper()

    if p in ("DOCTOR_PATIENT_AUTHORIZATION", "PATIENT_ACCESS", "DOCTOR_ADD"):
        return ["DOCTOR_PATIENT_AUTHORIZATION", "PATIENT_ACCESS", "DOCTOR_ADD"]
    if p in ("PATIENT_REGISTRATION",) or (p in ("REGISTER", "REGISTRATION") and r == "PATIENT"):
        return ["PATIENT_REGISTRATION", "REGISTER"]
    if p in ("DOCTOR_REGISTRATION",) or (p in ("REGISTER", "REGISTRATION") and r == "DOCTOR"):
        return ["DOCTOR_REGISTRATION", "REGISTER"]
    if p in ("LOGIN_PATIENT",) or (p == "LOGIN" and r == "PATIENT"):
        return ["LOGIN_PATIENT", "LOGIN"]
    if p in ("LOGIN_DOCTOR",) or (p == "LOGIN" and r == "DOCTOR"):
        return ["LOGIN_DOCTOR", "LOGIN"]
    return [p]

def verify_otp_for_phone(
    phone: str,
    code: Optional[str] = None,
    purpose: str = "LOGIN",
    db: Session = None,
    otp: Optional[str] = None,
    role: Optional[str] = None
) -> bool:
    """
    Verifies OTP against cryptographic hash, enforces expiry, single-use, attempt limit,
    and strict purpose / role segregation (Requirement 12 & 13).
    Accepts either 'code' or 'otp' keyword argument.
    """
    clean_phone = sanitize_phone(phone or "")
    raw_code = code if code is not None else otp
    clean_code = (raw_code or "").strip()

    if not clean_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter the 6-digit OTP code."
        )

    purposes = get_compatible_purposes(purpose, role)

    q = db.query(OTPVerification).filter(
        OTPVerification.phone == clean_phone,
        OTPVerification.purpose.in_(purposes),
        OTPVerification.is_verified == False
    )
    if role:
        q = q.filter(OTPVerification.role == role.upper())

    otp_record = q.order_by(OTPVerification.created_at.desc()).first()

    if not otp_record:
        # Check if an OTP was already verified/used (Requirement 9)
        used_q = db.query(OTPVerification).filter(
            OTPVerification.phone == clean_phone,
            OTPVerification.purpose.in_(purposes),
            OTPVerification.is_verified == True
        )
        if role:
            used_q = used_q.filter(OTPVerification.role == role.upper())
        used_otp = used_q.order_by(OTPVerification.created_at.desc()).first()

        if used_otp:
            if used_otp.attempts >= settings.OTP_MAX_ATTEMPTS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many incorrect OTP attempts. This code has been invalidated. Please request a new OTP."
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has already been used. Please request a new OTP."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending OTP request found for this mobile number. Please click 'Send OTP'."
        )

    # Expiry verification (Requirement 8)
    if datetime.datetime.utcnow() > otp_record.expires_at:
        otp_record.is_verified = True # Invalidate expired
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP."
        )

    # Attempt limit check (Requirement 10)
    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.is_verified = True # Invalidate maxed out
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect OTP attempts. This code is invalidated. Please request a new OTP."
        )

    # Verification using hash (or legacy plaintext fallback if otp_hash is missing)
    is_valid = False
    if otp_record.otp_hash:
        is_valid = verify_otp_hash(clean_phone, clean_code, otp_record.otp_hash)
    elif otp_record.otp_code:
        is_valid = secrets.compare_digest(otp_record.otp_code, clean_code)

    if not is_valid:
        otp_record.attempts += 1
        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp_record.is_verified = True # Invalidate on reaching max attempts
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many incorrect OTP attempts. This code is invalidated. Please request a new OTP."
            )
        db.commit()
        remaining = settings.OTP_MAX_ATTEMPTS - otp_record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect OTP. {remaining} attempt(s) remaining."
        )

    # Single-use enforcement: mark as verified (Requirement 9)
    otp_record.is_verified = True
    db.commit()
    return True

def create_access_token(data: dict) -> str:
    """Encodes JWT bearer access token."""
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """Decodes and validates JWT bearer access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )

def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts and validates user from Authorization: Bearer <token>.
    """
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token. Please log in."
        )

    token = auth_credentials.credentials
    payload = decode_access_token(token)

    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        user_id_int = user_id

    user = db.query(User).filter(User.id == user_id_int, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or has been deactivated."
        )

    return user

def require_role(allowed_roles: List[str]):
    """
    Dependency factory verifying user role against allowed list.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {allowed_roles}, but current role is '{current_user.role}'."
            )
        return current_user
    return role_checker

def log_audit(
    db: Session,
    user_id: Optional[int],
    role: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[str] = None
):
    """
    Records an immutable audit trail entry for critical actions.
    """
    try:
        entry = AuditLog(
            user_id=user_id,
            role=role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        print(f"Failed to record audit log: {e}")

def check_doctor_patient_access(doctor_id: Optional[int], patient_id: int, db: Session) -> bool:
    """
    Checks if a doctor has AUTHORIZED access to view a patient's medical records.
    Returns True if:
    1. Doctor has an explicit DoctorPatientAccess with status == 'AUTHORIZED'
    2. Fallback: Doctor has existing DoctorPatient association or DoctorViewedPatient record
    3. Patient has an active KioskSession (in_progress, awaiting_doctor) or active EmergencyAlert
    """
    if not doctor_id:
        return False

    from app.models import DoctorPatientAccess, DoctorPatient, DoctorViewedPatient, KioskSession, EmergencyAlert

    # 1. DoctorPatientAccess check
    grant = db.query(DoctorPatientAccess).filter(
        DoctorPatientAccess.doctor_id == doctor_id,
        DoctorPatientAccess.patient_id == patient_id
    ).first()
    if grant:
        if grant.status == "AUTHORIZED":
            grant.last_accessed_at = datetime.datetime.utcnow()
            try:
                db.commit()
            except Exception:
                db.rollback()
            return True
        return False

    # 2. Existing association or viewed patient fallback
    assoc = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == doctor_id,
        DoctorPatient.patient_id == patient_id,
        DoctorPatient.status == "ACTIVE"
    ).first()
    if assoc:
        new_dpa = DoctorPatientAccess(
            doctor_id=doctor_id,
            patient_id=patient_id,
            status="AUTHORIZED",
            authorized_at=datetime.datetime.utcnow(),
            last_accessed_at=datetime.datetime.utcnow()
        )
        db.add(new_dpa)
        try:
            db.commit()
        except Exception:
            db.rollback()
        return True

    vp = db.query(DoctorViewedPatient).filter(
        DoctorViewedPatient.doctor_id == doctor_id,
        DoctorViewedPatient.patient_id == patient_id
    ).first()
    if vp:
        new_dpa = DoctorPatientAccess(
            doctor_id=doctor_id,
            patient_id=patient_id,
            status="AUTHORIZED",
            authorized_at=datetime.datetime.utcnow(),
            last_accessed_at=datetime.datetime.utcnow()
        )
        db.add(new_dpa)
        try:
            db.commit()
        except Exception:
            db.rollback()
        return True

    # 3. Emergency alert fallback
    alert = db.query(EmergencyAlert).filter(
        EmergencyAlert.patient_id == patient_id,
        EmergencyAlert.status == "ACTIVE"
    ).first()
    if alert:
        return True

    return False

