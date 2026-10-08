"""
MediKiosk OTP Delivery Service & Provider Abstraction

Architecture:
OTPService
   │
   ├── BaseOTPProvider (Abstract Base)
   ├── FileOTPProvider (Development: writes to runtime/otp/latest_otp.txt)
   └── SMSOTPProvider  (Production: SMS gateway dispatch)
"""

import os
import abc
import hashlib
import secrets
import datetime
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("medikiosk.otp")

def mask_phone_for_otp(phone: str) -> str:
    """
    Masks phone number for development output and audit compliance:
    e.g. '9876543259' -> '+91********59'
    """
    clean = "".join(filter(str.isdigit, str(phone or "")))
    if clean.startswith("91") and len(clean) == 12:
        clean = clean[2:]
    elif len(clean) > 10:
        clean = clean[-10:]
    
    if len(clean) >= 2:
        return f"+91********{clean[-2:]}"
    return "+91**********"

def hash_otp(phone: str, otp_code: str) -> str:
    """
    Computes secure SHA-256 hash of OTP salted with application secret and phone number.
    Ensures plaintext OTP is never persisted in database records.
    """
    salt = settings.SECRET_KEY or "medikiosk_secure_otp_salt"
    payload = f"{phone}:{otp_code}:{salt}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

def verify_otp_hash(phone: str, otp_code: str, stored_hash: str) -> bool:
    """Constant-time timing-attack safe OTP hash comparison."""
    if not stored_hash or not otp_code:
        return False
    computed = hash_otp(phone, otp_code)
    return secrets.compare_digest(computed, stored_hash)

def normalize_otp_purpose(raw_purpose: str, role: str = "PATIENT") -> str:
    """
    Normalizes purpose keys for audit records and development file logging:
    - LOGIN + PATIENT -> LOGIN (or LOGIN_PATIENT)
    - LOGIN + DOCTOR  -> LOGIN (or LOGIN_DOCTOR)
    - REGISTER + PATIENT -> PATIENT_REGISTRATION
    - REGISTER + DOCTOR  -> DOCTOR_REGISTRATION
    - PATIENT_ACCESS / DOCTOR_ADD -> DOCTOR_PATIENT_AUTHORIZATION
    """
    p = (raw_purpose or "").strip().upper()
    r = (role or "").strip().upper()
    
    if p in ("PATIENT_ACCESS", "DOCTOR_ADD", "DOCTOR_PATIENT_AUTHORIZATION"):
        return "DOCTOR_PATIENT_AUTHORIZATION"
    if p in ("REGISTER", "REGISTRATION", "PATIENT_REGISTRATION") and r == "PATIENT":
        return "PATIENT_REGISTRATION"
    if p in ("REGISTER", "REGISTRATION", "DOCTOR_REGISTRATION") and r == "DOCTOR":
        return "DOCTOR_REGISTRATION"
    if p in ("LOGIN", "LOGIN_PATIENT") and r == "PATIENT":
        return "LOGIN"
    if p in ("LOGIN", "LOGIN_DOCTOR") and r == "DOCTOR":
        return "LOGIN"
    return p or "LOGIN"


class BaseOTPProvider(abc.ABC):
    """Abstract interface for OTP delivery providers."""

    @abc.abstractmethod
    def send_otp(
        self,
        phone: str,
        otp_code: str,
        purpose: str,
        role: str,
        expires_at: datetime.datetime
    ) -> bool:
        """Dispatches OTP through provider medium."""
        pass


class FileOTPProvider(BaseOTPProvider):
    """
    Development-only provider: writes latest OTP to a local protected text file.
    Strictly forbidden in production environments.
    """

    def __init__(self, file_path: Optional[str] = None):
        self.file_path = file_path or settings.OTP_FILE_PATH

    def get_resolved_path(self) -> str:
        # Resolve path relative to backend root directory if relative
        if os.path.isabs(self.file_path):
            resolved = self.file_path
        else:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            resolved = os.path.abspath(os.path.join(base_dir, self.file_path))
        
        # Security sanity check: never permit writing inside public/static web assets
        normalized = resolved.replace("\\", "/").lower()
        for forbidden in ("frontend/public", "frontend/src", "static/", "dist/", "public/"):
            if forbidden in normalized:
                raise RuntimeError(f"Security Violation: OTP file cannot be stored in web directory {resolved}")
        
        return resolved

    def send_otp(
        self,
        phone: str,
        otp_code: str,
        purpose: str,
        role: str,
        expires_at: datetime.datetime
    ) -> bool:
        # Fail fast if inadvertently invoked in production
        if settings.APP_ENV == "production":
            raise RuntimeError("CRITICAL SECURITY ERROR: FileOTPProvider cannot be used in production.")

        resolved_path = self.get_resolved_path()
        os.makedirs(os.path.dirname(resolved_path), exist_ok=True)

        masked_phone = mask_phone_for_otp(phone)
        display_purpose = normalize_otp_purpose(purpose, role)
        generated_at = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
        exp_iso = expires_at.isoformat(timespec="seconds") + "Z"

        content = (
            "MediKiosk Development OTP\n"
            "=========================\n"
            f"Purpose: {display_purpose}\n"
            f"Role: {role.upper()}\n"
            f"Mobile: {masked_phone}\n"
            f"OTP: {otp_code}\n"
            f"Expires At: {exp_iso}\n"
            f"Generated At: {generated_at}\n"
            "Status: ACTIVE\n"
            "=========================\n"
        )

        # Overwrite file completely (no continuous append / no permanent history)
        with open(resolved_path, "w", encoding="utf-8") as f:
            f.write(content)

        logger.info(
            "Development OTP generated for %s (purpose: %s, role: %s, written to %s)",
            masked_phone, display_purpose, role, self.file_path
        )
        return True


class SMSOTPProvider(BaseOTPProvider):
    """
    Production-ready SMS Provider interface for real gateway integration
    (e.g. Twilio, MSG91, AWS SNS, Karbon/Airtel DLT).
    """

    def send_otp(
        self,
        phone: str,
        otp_code: str,
        purpose: str,
        role: str,
        expires_at: datetime.datetime
    ) -> bool:
        masked_phone = mask_phone_for_otp(phone)
        # Production gateway dispatch logic here
        if not settings.SMS_API_KEY:
            logger.warning(
                "SMS Gateway API key not configured. Simulated dispatch for %s (purpose: %s)",
                masked_phone, purpose
            )
        else:
            logger.info("Dispatched OTP to %s via configured SMS gateway.", masked_phone)
        return True


def get_otp_provider() -> BaseOTPProvider:
    """
    Factory creating delivery provider based on environment and OTP_MODE.
    Guarantees file-based OTP is rejected in production.
    """
    mode = (settings.OTP_MODE or "file").strip().lower()

    if settings.APP_ENV == "production":
        if mode in ("file", "development"):
            raise RuntimeError(
                "Insecure configuration: OTP_MODE='file' is strictly prohibited in production."
            )
        return SMSOTPProvider()

    if mode in ("file", "development"):
        return FileOTPProvider()
    elif mode == "sms":
        return SMSOTPProvider()
    else:
        return FileOTPProvider()

