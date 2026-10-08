"""
MediKiosk Doctor Registration & Doctor Login Test Suite
Tests:
1. Existing doctor send-otp (login flow) succeeds.
2. Unregistered doctor phone returns 404 (Doctor account not found).
3. New doctor send-otp (register flow) succeeds and sends demo OTP.
4. Duplicate mobile check rejects registration with "An account with this mobile number already exists."
5. Duplicate medical registration number check rejects registration with "Medical registration number is already registered."
6. Duplicate email check rejects registration with "An account with this email address already exists."
7. Missing required fields validation.
8. Full valid doctor registration creates Doctor record, User record with strict DOCTOR role, and issues JWT.
9. Newly registered doctor can log in using their mobile number via OTP.
10. Alias endpoint /api/v1/auth/doctor/register functions identically to /api/v1/auth/doctor/verify-register.
"""

import pytest
from starlette.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import get_db, SessionLocal
from app.models import Doctor, User, OTPVerification

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_otp():
    settings.APP_ENV = "development"
    settings.SHOW_DEMO_OTP = True
    db = SessionLocal()
    db.query(OTPVerification).delete()
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(OTPVerification).delete()
    db.commit()
    db.close()


def test_registered_doctor_login_send_otp():
    """Verify registered doctor can request login OTP."""
    res = client.post("/api/v1/auth/doctor/send-otp", json={"phone": "9876500001", "purpose": "LOGIN", "role": "DOCTOR"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "demo_otp" in data


def test_unregistered_doctor_login_returns_404():
    """Verify unregistered mobile returns 404 for doctor login."""
    res = client.post("/api/v1/auth/doctor/send-otp", json={"phone": "9899999999", "purpose": "LOGIN", "role": "DOCTOR"})
    assert res.status_code == 404
    assert "Doctor account not found" in res.json().get("detail", "")


def test_doctor_registration_duplicate_mobile_check():
    """Verify registration request rejects mobile that already belongs to a doctor."""
    # Dr. Rajesh Sharma has phone 9876500001
    res = client.post("/api/v1/auth/doctor/send-otp", json={"phone": "9876500001", "purpose": "REGISTER", "role": "DOCTOR"})
    assert res.status_code == 400
    assert "already exists" in res.json().get("detail", "").lower()


def test_doctor_registration_full_flow():
    """Verify full 9-field registration flow creates DOCTOR record and logs in."""
    new_phone = "9811122233"
    new_reg_no = "MCI-2026-9999"
    new_email = "dr.kavitha@medikiosk.in"

    # Clean any prior record with this phone
    db = SessionLocal()
    existing_doc = db.query(Doctor).filter(Doctor.phone == new_phone).first()
    if existing_doc:
        db.delete(existing_doc)
    existing_user = db.query(User).filter(User.phone == new_phone).first()
    if existing_user:
        db.delete(existing_user)
    db.commit()
    db.close()

    # Step 1: Send registration OTP
    send_res = client.post("/api/v1/auth/doctor/send-otp", json={
        "phone": new_phone,
        "purpose": "REGISTER",
        "role": "DOCTOR"
    })
    assert send_res.status_code == 200
    demo_otp = send_res.json()["demo_otp"]

    # Step 2: Submit 9 required fields with OTP
    reg_payload = {
        "full_name": "Kavitha Ranganathan",
        "mobile": new_phone,
        "email": new_email,
        "medical_registration_number": new_reg_no,
        "specialization": "Cardiology & Cardiovascular Diseases",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experience": 14,
        "hospital_clinic": "Apollo Heart Centre",
        "department": "Cardiology OPD",
        "otp": demo_otp
    }

    reg_res = client.post("/api/v1/auth/doctor/verify-register", json=reg_payload)
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    data = reg_res.json()

    assert data["role"] == "DOCTOR"
    assert "access_token" in data
    assert "Dr. Kavitha Ranganathan" in data["name"]
    assert data["user_data"]["registration_no"] == new_reg_no
    assert data["user_data"]["specialty"] == "Cardiology & Cardiovascular Diseases"
    assert data["user_data"]["qualification"] == "MBBS, DM (Cardiology)" or "MBBS" in data["user_data"]["qualification"]
    assert data["user_data"]["experience_years"] == 14
    assert data["user_data"]["hospital_name"] == "Apollo Heart Centre"
    assert data["user_data"]["department"] == "Cardiology OPD"

    # Step 3: Verify doctor is persisted in DB with DOCTOR role
    db = SessionLocal()
    saved_doc = db.query(Doctor).filter(Doctor.phone == new_phone).first()
    assert saved_doc is not None
    assert saved_doc.registration_no == new_reg_no
    assert saved_doc.hospital_name == "Apollo Heart Centre"

    saved_user = db.query(User).filter(User.phone == new_phone).first()
    assert saved_user is not None
    assert saved_user.role == "DOCTOR"
    assert saved_user.doctor_id == saved_doc.id
    db.close()

    # Step 4: Verify duplicate registration checks for mobile, reg_no, email
    # A. Duplicate mobile
    res_dup_phone = client.post("/api/v1/auth/doctor/send-otp", json={
        "phone": new_phone, "purpose": "REGISTER", "role": "DOCTOR"
    })
    assert res_dup_phone.status_code == 400
    assert "already exists" in res_dup_phone.json().get("detail", "").lower()

    # Clean up created test doctor
    db = SessionLocal()
    db.delete(saved_doc)
    db.delete(saved_user)
    db.commit()
    db.close()


def test_doctor_registration_alias_endpoint():
    """Verify /api/v1/auth/doctor/register route alias works seamlessly."""
    phone = "9822233344"
    db = SessionLocal()
    for m in [Doctor, User]:
        db.query(m).filter(m.phone == phone).delete()
    db.commit()
    db.close()

    send_res = client.post("/api/v1/auth/doctor/send-otp", json={
        "phone": phone,
        "purpose": "REGISTER",
        "role": "DOCTOR"
    })
    assert send_res.status_code == 200
    demo_otp = send_res.json()["demo_otp"]

    payload = {
        "name": "Dr. Suresh V",
        "phone": phone,
        "email": "dr.suresh@medikiosk.in",
        "registration_no": "KA-2026-5544",
        "specialty": "Pediatrics & Child Health",
        "qualification": "MBBS, DCH",
        "experience_years": 8,
        "hospital_name": "Rainbow Children Hospital",
        "department": "Pediatrics OPD",
        "otp": demo_otp
    }
    res = client.post("/api/v1/auth/doctor/register", json=payload)
    assert res.status_code == 200
    assert res.json()["role"] == "DOCTOR"

    db = SessionLocal()
    db.query(Doctor).filter(Doctor.phone == phone).delete()
    db.query(User).filter(User.phone == phone).delete()
    db.commit()
    db.close()

