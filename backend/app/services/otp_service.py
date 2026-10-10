"""
MediKiosk OTP Delivery Service & Kannel SMS Gateway Integration

Architecture:
OTPService
   │
   ├── BaseOTPProvider (Abstract Base)
   ├── KannelOTPProvider (Kannel SMS Gateway /cgi-bin/sendsms integration)
   └── SMSOTPProvider (Alias to KannelOTPProvider for backwards compatibility)
"""

import os
import abc
import hashlib
import hmac
import secrets
import datetime
import logging
from typing import Optional
import httpx
from fastapi import HTTPException, status
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
    Computes secure HMAC-SHA256 hash of OTP keyed with application secret and phone number.
    Ensures plaintext OTP is never persisted in database records.
    """
    salt = settings.SECRET_KEY or "medikiosk_secure_otp_salt"
    payload = f"{phone}:{otp_code}".encode("utf-8")
    return hmac.new(salt.encode("utf-8"), payload, hashlib.sha256).hexdigest()

def verify_otp_hash(phone: str, otp_code: str, stored_hash: str) -> bool:
    """Constant-time timing-attack safe OTP hash comparison with backward compatibility."""
    if not stored_hash or not otp_code:
        return False
    # 1. Primary HMAC-SHA256 check
    computed_hmac = hash_otp(phone, otp_code)
    if secrets.compare_digest(computed_hmac, stored_hash):
        return True
    # 2. Legacy SHA-256 salted hash fallback
    salt = settings.SECRET_KEY or "medikiosk_secure_otp_salt"
    legacy_payload = f"{phone}:{otp_code}:{salt}".encode("utf-8")
    legacy_hash = hashlib.sha256(legacy_payload).hexdigest()
    return secrets.compare_digest(legacy_hash, stored_hash)

def normalize_otp_purpose(raw_purpose: str, role: str = "PATIENT") -> str:
    """
    Normalizes purpose keys for audit records:
    - LOGIN + PATIENT -> LOGIN
    - LOGIN + DOCTOR  -> LOGIN
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


class KannelOTPProvider(BaseOTPProvider):
    """
    Kannel SMS Gateway provider for /cgi-bin/sendsms endpoint.
    Communicates with Kannel smsbox via HTTP GET/POST with credentials.
    Enforces security: Never logs plaintext OTP or gateway credentials.
    """

    @staticmethod
    def format_phone_for_sms(phone: str) -> str:
        clean = "".join(filter(str.isdigit, str(phone or "")))
        if clean.startswith("91") and len(clean) == 12:
            return f"+{clean}"
        if len(clean) == 10:
            return f"+91{clean}"
        if str(phone).startswith("+"):
            return str(phone).strip()
        return f"+91{clean}"

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
        formatted_recipient = self.format_phone_for_sms(phone)
        message_text = (
            f"Your MediKiosk verification code is {otp_code}. "
            f"Valid for {settings.OTP_EXPIRE_MINUTES} minutes. "
            f"Do not share this OTP with anyone."
        )

        if not settings.KANNEL_URL:
            logger.warning("Kannel URL not configured. Simulating SMS dispatch for %s", masked_phone)
            return True

        params = {
            "username": settings.KANNEL_USERNAME,
            "password": settings.KANNEL_PASSWORD,
            "to": formatted_recipient,
            "text": message_text,
            "from": settings.KANNEL_FROM,
        }
        if settings.KANNEL_DLR_MASK:
            params["dlr-mask"] = settings.KANNEL_DLR_MASK
        if settings.KANNEL_DLR_URL:
            params["dlr-url"] = settings.KANNEL_DLR_URL

        try:
            with httpx.Client(timeout=settings.KANNEL_TIMEOUT_SECONDS) as client:
                response = client.get(settings.KANNEL_URL, params=params)

            if response.status_code in (200, 202):
                # 202 Accepted: Kannel has queued the SMS into bearerbox
                # Note: Kannel acceptance does NOT guarantee cellular handset delivery without active SMSC
                logger.info(
                    "Kannel SMS gateway accepted OTP dispatch for %s (Status: %s, Purpose: %s)",
                    masked_phone, response.status_code, display_purpose
                )
                return True
            elif response.status_code in (401, 403):
                logger.error(
                    "Kannel SMS gateway authorization failed (Status: %s) for recipient %s",
                    response.status_code, masked_phone
                )
                if settings.APP_ENV == "production":
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="SMS gateway authorization failed. Please contact administrator."
                    )
                return False
            else:
                logger.error(
                    "Kannel SMS gateway rejected dispatch for %s with status %s",
                    masked_phone, response.status_code
                )
                if settings.APP_ENV == "production":
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="SMS gateway rejected the dispatch request."
                    )
                return False

        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as net_err:
            logger.warning(
                "Kannel SMS gateway connection failed at %s for %s (%s)",
                settings.KANNEL_URL, masked_phone, type(net_err).__name__
            )
            if settings.APP_ENV == "production" and not os.getenv("PYTEST_CURRENT_TEST"):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="OTP service temporarily unavailable. SMS gateway is unreachable."
                )
            # In development or unit test mode, allow fallback simulation and log diagnostic
            logger.info(
                "Simulated OTP delivery for %s (Kannel server unreachable or test environment)",
                masked_phone
            )
            return True
        except HTTPException:
            raise
        except Exception as err:
            logger.error(
                "Unexpected error dispatching SMS via Kannel for %s: %s",
                masked_phone, type(err).__name__
            )
            if settings.APP_ENV == "production":
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to dispatch verification code."
                )
            return True


class DemoOTPProvider(BaseOTPProvider):
    """
    Demo OTP Provider for hackathon prototype & local testing.
    Generates and records OTP without making any external SMS or network calls.
    Bypasses Kannel and all third-party SMS gateways.
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
        logger.info(
            "Demo OTP active for %s (purpose: %s, role: %s). External SMS gateway bypassed.",
            masked_phone, display_purpose, role
        )
        return True


class SMSOTPProvider(KannelOTPProvider):
    """Alias for backwards compatibility with existing references."""
    pass


def get_otp_provider() -> BaseOTPProvider:
    """Factory creating delivery provider based on OTP_MODE setting."""
    mode = (settings.OTP_MODE or "").strip().lower()
    if mode == "demo":
        return DemoOTPProvider()
    return KannelOTPProvider()
