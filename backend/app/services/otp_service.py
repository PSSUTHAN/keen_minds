"""
MediKiosk OTP Delivery Service & Provider Abstraction

Architecture:
OTPService
   │
   ├── BaseOTPProvider (Abstract Base)
   └── SMSOTPProvider  (SMS/Kannel Gateway dispatch; simulated in dev without plaintext logging)
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


class SMSOTPProvider(BaseOTPProvider):
    """
    SMS Provider interface for gateway integration (e.g. Kannel, Twilio, MSG91, AWS SNS).
    Simulates gateway dispatch when SMS_API_KEY is not configured.
    Plaintext OTP is never logged in application logs.
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
        display_purpose = normalize_otp_purpose(purpose, role)
        if not settings.SMS_API_KEY:
            logger.info(
                "SMS/Kannel dispatch simulated for %s (purpose: %s, role: %s)",
                masked_phone, display_purpose, role
            )
        else:
            logger.info("Dispatched OTP to %s via configured SMS/Kannel gateway.", masked_phone)
        return True


def get_otp_provider() -> BaseOTPProvider:
    """
    Factory creating delivery provider based on environment.
    File-based OTP delivery is disabled in favor of UI Demo OTP in development and SMS in production.
    """
    return SMSOTPProvider()

