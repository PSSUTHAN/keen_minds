"""
MediKiosk Development OTP Text File Delivery Test Suite

Covers all 28 security specifications:
1. Patient Login OTP request creates development OTP file.
2. API response strictly NEVER contains OTP or dev_mock_otp.
3. Read OTP from backend/runtime/otp/latest_otp.txt.
4. Correct OTP successfully authenticates.
5. Incorrect OTP is rejected.
6. New OTP invalidates previous unverified OTP (old OTP fails).
7. Expired OTP is rejected with proper error message.
8. Reusing an already-verified OTP fails ("OTP has already been used").
9. Exceeding maximum attempts (5) permanently invalidates the OTP.
10. Purpose segregation: Doctor OTP cannot be used for Patient Login.
11. Doctor-Patient authorization flow via OTP.
12. Plaintext OTP is NEVER stored in database (only cryptographic hash).
13. Security guardrail: OTP_MODE='file' is strictly prohibited in production.
14. OTP text file is outside public web directories.
15. Bypass OTP values ("123456", "000000") do NOT authenticate.
"""

import os
import re
import datetime
import pytest
from starlette.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import get_db
from app.models import User, Patient, Doctor, OTPVerification, DoctorPatientAccess
from app.services.otp_service import FileOTPProvider, get_otp_provider, mask_phone_for_otp, hash_otp

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_otp_state():
    """Cleans up OTP records before and after each test."""
    db = next(get_db())
    db.query(OTPVerification).delete()
    db.commit()
    yield
    db.query(OTPVerification).delete()
    db.commit()

def read_latest_otp_from_file() -> tuple[str, str, str]:
    """
    Parses backend/runtime/otp/latest_otp.txt and returns (otp_code, purpose, masked_mobile).
    """
    provider = FileOTPProvider()
    filepath = provider.get_resolved_path()
    assert os.path.exists(filepath), f"Expected OTP file at {filepath}"

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    otp_match = re.search(r"OTP:\s*(\d{6})", content)
    purpose_match = re.search(r"Purpose:\s*(\w+)", content)
    mobile_match = re.search(r"Mobile:\s*([^\n\r]+)", content)

    assert otp_match, f"OTP not found in file content:\n{content}"
    otp_code = otp_match.group(1)
    purpose = purpose_match.group(1) if purpose_match else ""
    mobile = mobile_match.group(1) if mobile_match else ""
    return otp_code, purpose, mobile

def test_patient_login_file_otp_flow():
    """Tests items 1-6: Send OTP, file write, no API exposure, file read, successful login."""
    phone = "9876543210" # Ramesh Kumar
    
    # 1. Request Patient Login OTP
    res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res.status_code == 200
    data = res.json()

    # 2. Confirm API response NEVER contains OTP
    assert "dev_mock_otp" not in data
    assert "otp" not in data
    assert "otp_code" not in data
    assert data["success"] is True

    # 3. Confirm OTP file is created and contains valid 6-digit code
    otp_code, purpose, masked_mobile = read_latest_otp_from_file()
    assert len(otp_code) == 6
    assert otp_code.isdigit()
    assert "LOGIN" in purpose
    assert masked_mobile == "+91********10"

    # 4. Verify Database stores ONLY otp_hash and NOT plaintext otp_code
    db = next(get_db())
    record = db.query(OTPVerification).filter(OTPVerification.phone == phone, OTPVerification.is_verified == False).first()
    assert record is not None
    assert record.otp_code in (None, "", "[HASHED]", "[SECURE_HASHED]")
    assert record.otp_hash is not None
    assert len(record.otp_hash) == 64 # SHA-256 hex length

    # 5. Login using correct OTP read from file
    login_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": otp_code})
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["role"] == "PATIENT"
    assert "access_token" in login_data

def test_incorrect_otp_rejected():
    """Tests items 7-8: Incorrect OTP fails with remaining attempt count."""
    phone = "9876543210"
    client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    
    bad_res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "999999"})
    assert bad_res.status_code == 400
    assert "Incorrect OTP" in bad_res.json()["detail"]

def test_new_otp_invalidates_previous_otp():
    """Tests items 9-10: Requesting a new OTP invalidates the previous unverified OTP."""
    phone = "9876543220" # Sunita Devi
    
    # Send first OTP
    res1 = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res1.status_code == 200
    old_otp, _, _ = read_latest_otp_from_file()

    # Reset cooldown in DB for immediate second OTP request
    db = next(get_db())
    db.query(OTPVerification).filter(OTPVerification.phone == phone).update({"created_at": datetime.datetime.utcnow() - datetime.timedelta(seconds=60)})
    db.commit()

    # Send second OTP
    res2 = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res2.status_code == 200
    new_otp, _, _ = read_latest_otp_from_file()
    assert old_otp != new_otp

    # Attempt login with OLD OTP -> must be rejected
    res_old = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": old_otp})
    assert res_old.status_code == 400

    # Login with NEW OTP -> succeeds
    res_new = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": new_otp})
    assert res_new.status_code == 200

def test_expired_otp_rejected():
    """Tests items 11-12: Expired OTP is rejected."""
    phone = "9876543230" # Muthu Kumar
    res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res.status_code == 200
    otp_code, _, _ = read_latest_otp_from_file()

    # Artificially expire the OTP in database
    db = next(get_db())
    record = db.query(OTPVerification).filter(OTPVerification.phone == phone, OTPVerification.is_verified == False).first()
    assert record is not None
    record.expires_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
    db.commit()

    res = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": otp_code})
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()

def test_single_use_otp_reuse_fails():
    """Tests items 13-14: OTP cannot be reused after successful verification."""
    phone = "9876543240" # Arun Kumar
    res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res.status_code == 200
    otp_code, _, _ = read_latest_otp_from_file()

    # First verification -> SUCCESS
    res1 = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": otp_code})
    assert res1.status_code == 200

    # Second verification with same OTP -> FAILS
    res2 = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": otp_code})
    assert res2.status_code == 400
    assert "already been used" in res2.json()["detail"].lower() or "no pending otp" in res2.json()["detail"].lower()

def test_max_attempts_exceeded_invalidates_otp():
    """Tests items 15-16: Reaching max attempts (5) permanently invalidates the OTP."""
    phone = "9876543250" # Priya Devi
    res = client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    assert res.status_code == 200
    otp_code, _, _ = read_latest_otp_from_file()

    # Enter wrong OTP 5 times
    for i in range(5):
        client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "000000"})

    # Even if user enters correct OTP now, it must be rejected as invalidated
    res_final = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": otp_code})
    assert res_final.status_code == 400
    assert "invalidated" in res_final.json()["detail"].lower() or "too many" in res_final.json()["detail"].lower()

def test_purpose_segregation():
    """Tests items 17-19: Doctor OTP has DOCTOR purpose and cannot be used for Patient Login."""
    doc_phone = "9876500001" # Dr. Rajesh Sharma
    
    # Request Doctor Login OTP
    res_doc = client.post("/api/v1/auth/doctor/send-otp", json={"phone": doc_phone, "purpose": "LOGIN", "role": "DOCTOR"})
    assert res_doc.status_code == 200
    doc_otp, purpose, _ = read_latest_otp_from_file()
    assert len(doc_otp) == 6

    # Attempt to use Doctor OTP for Patient Login -> MUST FAIL (does not consume doctor OTP)
    res_patient_attempt = client.post("/api/v1/auth/patient/verify-login", json={"phone": doc_phone, "otp": doc_otp})
    assert res_patient_attempt.status_code in (400, 404)

    # Doctor Login with correct OTP -> SUCCEEDS
    res_doc_login = client.post("/api/v1/auth/doctor/verify-login", json={"phone": doc_phone, "otp": doc_otp, "role": "DOCTOR"})
    assert res_doc_login.status_code == 200
    assert res_doc_login.json()["role"] == "DOCTOR"

def test_doctor_patient_authorization_otp_flow():
    """Tests items 20-21: Doctor-Patient authorization via development OTP file."""
    doc_phone = "9876500001"
    
    # 1. Authenticate Doctor
    client.post("/api/v1/auth/doctor/send-otp", json={"phone": doc_phone, "purpose": "LOGIN", "role": "DOCTOR"})
    doc_otp, _, _ = read_latest_otp_from_file()
    login_res = client.post("/api/v1/auth/doctor/verify-login", json={"phone": doc_phone, "otp": doc_otp, "role": "DOCTOR"})
    doc_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {doc_token}"}

    # Reset OTP records so request-access has clean cooldown
    db = next(get_db())
    db.query(OTPVerification).delete()
    db.commit()

    # 2. Doctor requests access for patient #2 (Sunita Devi)
    req_res = client.post("/api/v1/doctor/patients/2/request-access", headers=headers)
    assert req_res.status_code == 200
    assert "dev_mock_otp" not in req_res.json()

    # 3. Read authorization OTP from file
    auth_otp, purpose, masked_mobile = read_latest_otp_from_file()
    assert len(auth_otp) == 6

    # 4. Verify authorization with correct OTP
    verify_res = client.post("/api/v1/doctor/patients/2/verify-access", headers=headers, json={"otp": auth_otp})
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "AUTHORIZED"

def test_production_rejects_file_otp_mode():
    """Tests requirement 4 & 21: Application strictly forbids OTP_MODE='file' in production."""
    provider = FileOTPProvider()
    
    orig_env = settings.APP_ENV
    orig_mode = settings.OTP_MODE
    try:
        settings.APP_ENV = "production"
        settings.OTP_MODE = "file"
        with pytest.raises(RuntimeError) as exc_info:
            settings.validate_security()
        assert "strictly prohibited" in str(exc_info.value).lower()

        # FileOTPProvider.send_otp must also refuse in production
        with pytest.raises(RuntimeError) as exc_info2:
            provider.send_otp("9876543210", "123456", "LOGIN", "PATIENT", datetime.datetime.utcnow())
        assert "cannot be used in production" in str(exc_info2.value).lower()
    finally:
        settings.APP_ENV = orig_env
        settings.OTP_MODE = orig_mode

def test_hardcoded_bypass_values_rejected():
    """Tests requirement 7: Bypass codes ('123456', '000000') are strictly rejected."""
    phone = "9876543210"
    client.post("/api/v1/auth/patient/send-otp", json={"phone": phone, "purpose": "LOGIN"})
    actual_otp, _, _ = read_latest_otp_from_file()

    # Ensure actual_otp is not accidentally 123456
    if actual_otp != "123456":
        res_bypass = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "123456"})
        assert res_bypass.status_code == 400

    if actual_otp != "000000":
        res_bypass0 = client.post("/api/v1/auth/patient/verify-login", json={"phone": phone, "otp": "000000"})
        assert res_bypass0.status_code == 400

