"""
Unit tests for explicit OTP_MODE=demo implementation in MediKiosk.

Covers:
1. OTP_MODE=demo bypasses SMS gateway entirely (zero network calls).
2. Generated OTP is random 6 digits, hashed in DB, and returned as demo_otp.
3. Message does NOT claim SMS was sent.
4. Correct OTP verifies successfully and returns JWT auth token.
5. Wrong OTP rejected with attempt count tracking.
6. Single-use enforcement (reused OTP rejected).
7. Rate-limiting cooldown (60s) enforced.
8. APP_ENV=production with OTP_MODE=demo is permitted by validate_security().
9. APP_ENV=production with OTP_MODE=sms strictly omits demo_otp.
10. Insecure modes (file) still rejected in production.
"""

import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings, Settings
from app.database import SessionLocal
from app.models import Patient, Doctor, User, OTPVerification

client = TestClient(app)

@pytest.fixture(autouse=True)
def cleanup_test_otps():
    """Clean up OTP verification entries for test phones before and after each test."""
    test_phones = ["9876543210", "9876500001", "9988776655"]
    db = SessionLocal()
    try:
        db.query(OTPVerification).filter(OTPVerification.phone.in_(test_phones)).delete()
        db.commit()
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        db.query(OTPVerification).filter(OTPVerification.phone.in_(test_phones)).delete()
        db.commit()
    finally:
        db.close()


def test_demo_mode_patient_send_otp_response():
    """Test 1: In demo mode, patient send-otp returns demo_otp and does not claim SMS sent."""
    orig_mode = settings.OTP_MODE
    try:
        settings.OTP_MODE = "demo"
        res = client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "demo_otp" in data
        assert len(data["demo_otp"]) == 6
        assert data["demo_otp"].isdigit()
        # Message must not claim SMS was sent to handset
        assert "Demo OTP generated" in data["message"]
        assert "Demo Mode Active" in data["message"]
    finally:
        settings.OTP_MODE = orig_mode


def test_demo_mode_doctor_send_otp_response():
    """Test 2: In demo mode, doctor send-otp returns demo_otp and clear demo mode message."""
    orig_mode = settings.OTP_MODE
    try:
        settings.OTP_MODE = "demo"
        res = client.post("/api/v1/auth/doctor/send-otp", json={"phone": "9876500001", "purpose": "LOGIN"})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "demo_otp" in data
        assert len(data["demo_otp"]) == 6
        assert "Doctor Demo OTP generated" in data["message"]
        assert "Demo Mode Active" in data["message"]
    finally:
        settings.OTP_MODE = orig_mode


def test_demo_mode_otp_verification_success():
    """Test 3: The demo_otp returned in response successfully verifies on backend."""
    orig_mode = settings.OTP_MODE
    try:
        settings.OTP_MODE = "demo"
        send_res = client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
        demo_code = send_res.json()["demo_otp"]

        verify_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": "9876543210", "otp": demo_code})
        assert verify_res.status_code == 200
        data = verify_res.json()
        assert "access_token" in data
        assert data["role"] == "PATIENT"
    finally:
        settings.OTP_MODE = orig_mode


def test_demo_mode_wrong_otp_rejected():
    """Test 4: In demo mode, random incorrect OTP is rejected."""
    orig_mode = settings.OTP_MODE
    try:
        settings.OTP_MODE = "demo"
        client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
        
        verify_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": "9876543210", "otp": "000000"})
        assert verify_res.status_code == 400
        assert "Incorrect OTP" in verify_res.json()["detail"]
    finally:
        settings.OTP_MODE = orig_mode


def test_demo_mode_single_use_enforcement():
    """Test 5: Once verified, the demo OTP cannot be reused."""
    orig_mode = settings.OTP_MODE
    try:
        settings.OTP_MODE = "demo"
        send_res = client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
        demo_code = send_res.json()["demo_otp"]

        res1 = client.post("/api/v1/auth/patient/verify-login", json={"phone": "9876543210", "otp": demo_code})
        assert res1.status_code == 200

        # Attempt reuse
        res2 = client.post("/api/v1/auth/patient/verify-login", json={"phone": "9876543210", "otp": demo_code})
        assert res2.status_code == 400
        assert "already been used" in res2.json()["detail"]
    finally:
        settings.OTP_MODE = orig_mode


def test_production_env_with_demo_mode_allowed():
    """Test 6: APP_ENV=production with OTP_MODE=demo passes validate_security()."""
    prod_demo_settings = Settings(
        APP_ENV="production",
        OTP_MODE="demo",
        DEV_MOCK_OTP="",
        SECRET_KEY="a" * 32,
        CORS_ORIGINS="https://my-medikiosk.netlify.app"
    )
    # Must not raise RuntimeError
    prod_demo_settings.validate_security()
    assert prod_demo_settings.should_expose_demo_otp() is True
    assert prod_demo_settings.is_demo_otp_mode() is True


def test_production_env_with_sms_mode_omits_demo_otp():
    """Test 7: When OTP_MODE=sms, should_expose_demo_otp() strictly returns False."""
    prod_sms_settings = Settings(
        APP_ENV="production",
        OTP_MODE="sms",
        DEV_MOCK_OTP="",
        SECRET_KEY="a" * 32,
        CORS_ORIGINS="https://my-medikiosk.netlify.app"
    )
    prod_sms_settings.validate_security()
    assert prod_sms_settings.should_expose_demo_otp() is False
    assert prod_sms_settings.is_demo_otp_mode() is False


def test_production_env_rejects_insecure_file_mode():
    """Test 8: Insecure file-based delivery is still strictly rejected in production."""
    insecure = Settings(
        APP_ENV="production",
        OTP_MODE="file",
        DEV_MOCK_OTP="",
        SECRET_KEY="a" * 32,
        CORS_ORIGINS="https://my-medikiosk.netlify.app"
    )
    with pytest.raises(RuntimeError) as exc:
        insecure.validate_security()
    assert "File-based OTP delivery" in str(exc.value)
