"""
MediKiosk Development Demo OTP Test Suite

Validates:
1. Demo OTP is returned in API response ONLY when APP_ENV=development and SHOW_DEMO_OTP=true.
2. The returned demo_otp authenticates successfully through FastAPI.
3. Incorrect OTP is rejected.
4. Expired OTP is rejected.
5. Requesting a new OTP invalidates previous OTP.
6. Single-use enforcement: used OTP cannot be reused.
7. Max attempts (5) permanently invalidates OTP.
8. Purpose and role segregation (Doctor OTP cannot be used for Patient Login).
9. Doctor-patient authorization flow returns demo_otp and authorizes patient.
10. In production (APP_ENV=production, SHOW_DEMO_OTP=false), demo_otp is NEVER returned.
11. In production, SHOW_DEMO_OTP=true fails startup fast with RuntimeError.
12. No text files (latest_otp.txt, runtime/otp/) are created.
13. Hardcoded bypass codes ('123456', '000000') are rejected.
"""

import os
import time
import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings, Settings
from app.database import get_db, SessionLocal
from app.models import OTPVerification, Patient, Doctor, User, DoctorPatientAccess
from app.services.otp_service import mask_phone_for_otp, hash_otp, verify_otp_hash

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_otp_db():
    """Cleans up OTP verifications and access records for clean cooldown between tests."""
    db = next(get_db())
    db.query(OTPVerification).delete()
    db.query(DoctorPatientAccess).delete()
    db.commit()
    yield
    db.query(OTPVerification).delete()
    db.query(DoctorPatientAccess).delete()
    db.commit()


def test_demo_otp_present_in_dev_response():
    """TEST 1: In development with SHOW_DEMO_OTP=true, demo_otp is present in send-otp response."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True

    res = client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "demo_otp" in data, "demo_otp MUST be present in development mode"
    assert len(data["demo_otp"]) == 6
    assert data["demo_otp"].isdigit()


def test_demo_otp_verifies_successfully():
    """TEST 2: Entering the returned demo_otp authenticates successfully via FastAPI."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    phone = "9876543210" # Ramesh Kumar

    send_res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert send_res.status_code == 200
    demo_otp = send_res.json()["demo_otp"]

    verify_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": demo_otp})
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert "access_token" in data
    assert data["role"] == "PATIENT"
    assert data["user_data"]["name"] == "Ramesh Kumar"


def test_incorrect_otp_rejected():
    """TEST 3: Entering an incorrect OTP fails verification."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    phone = "9876543220" # Sunita Devi

    send_res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert send_res.status_code == 200

    verify_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "999999"})
    assert verify_res.status_code == 400
    assert "incorrect" in verify_res.json()["detail"].lower()


def test_expired_otp_rejected():
    """TEST 4: Expired OTP is rejected."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    phone = "9876543230" # Muthu Kumar

    send_res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert send_res.status_code == 200
    demo_otp = send_res.json()["demo_otp"]

    db = next(get_db())
    record = db.query(OTPVerification).filter(OTPVerification.phone == phone, OTPVerification.is_verified == False).first()
    assert record is not None
    record.expires_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
    db.commit()

    verify_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": demo_otp})
    assert verify_res.status_code == 400
    assert "expired" in verify_res.json()["detail"].lower()


def test_new_otp_invalidates_previous_otp():
    """TEST 5: Requesting a new OTP invalidates previous OTP code."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    phone = "9876543210"

    # Request OTP #1
    res1 = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res1.status_code == 200
    otp_1 = res1.json()["demo_otp"]

    # Bypass cooldown by backdating created_at in DB
    db = next(get_db())
    db.query(OTPVerification).filter(OTPVerification.phone == phone).update(
        {"created_at": datetime.datetime.utcnow() - datetime.timedelta(seconds=60)}
    )
    db.commit()

    # Request OTP #2
    res2 = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res2.status_code == 200
    otp_2 = res2.json()["demo_otp"]

    # Verify with old OTP #1 -> FAILS
    fail_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": otp_1})
    assert fail_res.status_code == 400

    # Verify with new OTP #2 -> SUCCEEDS
    ok_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": otp_2})
    assert ok_res.status_code == 200


def test_single_use_otp_reuse_fails():
    """TEST 6: Single-use enforcement: OTP cannot be reused after verification."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    phone = "9876543240" # Arun Kumar

    res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res.status_code == 200
    demo_otp = res.json()["demo_otp"]

    # First verification -> SUCCESS
    res1 = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": demo_otp})
    assert res1.status_code == 200

    # Second verification with same OTP -> FAILS
    res2 = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": demo_otp})
    assert res2.status_code == 400
    assert "already been used" in res2.json()["detail"].lower() or "no pending otp" in res2.json()["detail"].lower()


def test_max_attempts_exceeded_invalidates_otp():
    """TEST 7: Reaching max attempts (5) permanently invalidates the OTP."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    phone = "9876543250" # Priya Devi

    res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res.status_code == 200
    demo_otp = res.json()["demo_otp"]

    # 5 wrong attempts
    for _ in range(5):
        client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "000000"})

    # Even with correct demo OTP, it is permanently locked
    res_final = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": demo_otp})
    assert res_final.status_code == 400
    assert "invalidated" in res_final.json()["detail"].lower() or "too many" in res_final.json()["detail"].lower()


def test_purpose_segregation():
    """TEST 8: Doctor OTP cannot be consumed or redeemed for Patient Login."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    doc_phone = "9876500001" # Dr. Rajesh Sharma

    # Request Doctor Login OTP
    res_doc = client.post("/api/v1/auth/doctor/send-otp", json={"phone": doc_phone, "purpose": "LOGIN", "role": "DOCTOR"})
    assert res_doc.status_code == 200
    doc_otp = res_doc.json()["demo_otp"]

    # Attempt to use Doctor OTP for Patient Login -> MUST FAIL (does not consume doctor OTP)
    res_patient_attempt = client.post("/api/v1/auth/patient/verify-login", json={"phone": doc_phone, "otp": doc_otp})
    assert res_patient_attempt.status_code in (400, 404)

    # Doctor Login with correct OTP -> SUCCEEDS
    res_doc_login = client.post("/api/v1/auth/doctor/verify-login", json={"phone": doc_phone, "otp": doc_otp, "role": "DOCTOR"})
    assert res_doc_login.status_code == 200
    assert res_doc_login.json()["role"] == "DOCTOR"


def test_doctor_patient_authorization_demo_otp_flow():
    """TEST 9: Doctor-Patient access authorization returns demo_otp in development and authorizes patient."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    doc_phone = "9876500001"

    # Authenticate Doctor
    doc_send = client.post("/api/v1/auth/doctor/send-otp", json={"phone": doc_phone, "purpose": "LOGIN", "role": "DOCTOR"})
    doc_otp = doc_send.json()["demo_otp"]
    login_res = client.post("/api/v1/auth/doctor/verify-login", json={"phone": doc_phone, "otp": doc_otp, "role": "DOCTOR"})
    doc_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {doc_token}"}

    # Reset OTP records so request-access has clean cooldown
    db = next(get_db())
    db.query(OTPVerification).delete()
    db.commit()

    # Doctor requests access for patient #2 (Sunita Devi)
    req_res = client.post("/api/v1/doctor/patients/2/request-access", headers=headers)
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert "demo_otp" in req_data
    auth_otp = req_data["demo_otp"]
    assert len(auth_otp) == 6

    # Verify authorization with returned demo_otp
    verify_res = client.post("/api/v1/doctor/patients/2/verify-access", headers=headers, json={"otp": auth_otp})
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "AUTHORIZED"


def test_production_mode_omits_demo_otp():
    """TEST 10: In production configuration (APP_ENV=production, SHOW_DEMO_OTP=false), demo_otp is NEVER present."""
    orig_env = settings.APP_ENV
    orig_show = settings.SHOW_DEMO_OTP
    orig_mode = settings.OTP_MODE
    try:
        settings.APP_ENV = "production"
        settings.SHOW_DEMO_OTP = False
        settings.OTP_MODE = "sms"

        res = client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
        assert res.status_code == 200
        data = res.json()
        assert "demo_otp" not in data, "demo_otp MUST NOT be in production response"
        assert "otp" not in data
        assert "dev_mock_otp" not in data
        assert "otp_code" not in data
    finally:
        settings.APP_ENV = orig_env
        settings.SHOW_DEMO_OTP = orig_show
        settings.OTP_MODE = orig_mode


def test_production_fail_fast_if_show_demo_otp_is_true():
    """TEST 11: Application fails startup fast if SHOW_DEMO_OTP=true while APP_ENV=production."""
    insecure = Settings(
        APP_ENV="production",
        SHOW_DEMO_OTP=True,
        OTP_MODE="sms",
        DEV_MOCK_OTP="",
        SECRET_KEY="a" * 32,
        CORS_ORIGINS="http://localhost:5173"
    )
    with pytest.raises(RuntimeError) as exc_info:
        insecure.validate_security()
    assert "SHOW_DEMO_OTP is strictly prohibited in production" in str(exc_info.value)


def test_no_otp_file_created():
    """TEST 12: Confirms that file-based delivery is disabled and zero OTP text files are created."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True

    client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
    
    # Check that runtime/otp/latest_otp.txt does NOT exist
    assert not os.path.exists("runtime/otp/latest_otp.txt")
    assert not os.path.exists("latest_otp.txt")
    assert not os.path.exists("OTP.txt")


def test_hardcoded_bypass_values_rejected():
    """TEST 13: Universal bypass codes ('123456', '000000') are rejected."""
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    phone = "9876543210"

    send_res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    actual_demo_otp = send_res.json()["demo_otp"]

    if actual_demo_otp != "123456":
        res_bypass = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "123456"})
        assert res_bypass.status_code == 400

    if actual_demo_otp != "000000":
        res_bypass0 = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "000000"})
        assert res_bypass0.status_code == 400

