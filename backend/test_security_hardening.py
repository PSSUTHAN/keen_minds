"""
MediKiosk Comprehensive Security Hardening Test Suite
Verifies all 9 Priority-1 Security Vulnerabilities:
1. OTP never exposed in API response
2. OTP bypass removed (fails in production)
3. Hardcoded/default JWT SECRET_KEY rejected in production (fail-fast)
4. Admin endpoints require authentication and ADMIN role
5. Medical history endpoints require authentication and authorization
6. Document/report endpoints require authentication and authorization
7. JWT token in URL query parameter rejected (?token= forbidden)
8. HTTPS and security transport headers enforced
9. CORS wildcard forbidden and strict whitelist enforced
"""

import os
import sys
import pytest
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import Settings, settings
from app.main import app
from app.database import Base, get_db, SessionLocal
from app.models import User, Patient, Doctor, DoctorPatientAccess, OTPVerification
from app.services.auth_service import create_access_token

client = TestClient(app)

def get_or_create_tokens():
    """Generates valid JWT tokens for test roles."""
    db = SessionLocal()
    try:
        # 1. Admin Token
        admin_user = db.query(User).filter(User.role == "ADMIN").first()
        if not admin_user:
            admin_user = User(
                phone="9876500000",
                role="ADMIN",
                email="admin@medikiosk.in",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        admin_token = create_access_token({
            "user_id": admin_user.id,
            "sub": str(admin_user.id),
            "role": "ADMIN",
            "phone": admin_user.phone
        })

        # 2. Doctor Token (Dr. Rajesh Sharma, id 1)
        doc1 = db.query(Doctor).filter(Doctor.id == 1).first()
        doc_user = db.query(User).filter(User.phone == doc1.phone).first() if doc1 else None
        if not doc_user:
            doc_user = User(
                phone=doc1.phone if doc1 else "9876500001",
                role="DOCTOR",
                doctor_id=1,
                email="dr.rajesh@medikiosk.in",
                is_active=True
            )
            db.add(doc_user)
            db.commit()
            db.refresh(doc_user)
        else:
            if not doc_user.doctor_id:
                doc_user.doctor_id = 1
                db.commit()

        doctor_token = create_access_token({
            "user_id": doc_user.id,
            "sub": str(doc_user.id),
            "role": "DOCTOR",
            "doctor_id": doc_user.doctor_id or 1,
            "phone": doc_user.phone
        })

        # 3. Patient 1 Token (Ramesh Kumar, id 1)
        p1 = db.query(Patient).filter(Patient.id == 1).first()
        p1_user = db.query(User).filter(User.phone == p1.phone).first() if p1 else None
        if not p1_user:
            p1_user = User(
                phone=p1.phone if p1 else "9876543210",
                role="PATIENT",
                patient_id=1,
                email="ramesh@example.com",
                is_active=True
            )
            db.add(p1_user)
            db.commit()
            db.refresh(p1_user)
        else:
            if not p1_user.patient_id:
                p1_user.patient_id = 1
                db.commit()

        patient1_token = create_access_token({
            "user_id": p1_user.id,
            "sub": str(p1_user.id),
            "role": "PATIENT",
            "patient_id": p1_user.patient_id or 1,
            "phone": p1_user.phone
        })

        # 4. Patient 2 Token (Sunita Devi, id 2)
        p2 = db.query(Patient).filter(Patient.id == 2).first()
        p2_user = db.query(User).filter(User.phone == p2.phone).first() if p2 else None
        if not p2_user:
            p2_user = User(
                phone=p2.phone if p2 else "9876543211",
                role="PATIENT",
                patient_id=2,
                email="sunita@example.com",
                is_active=True
            )
            db.add(p2_user)
            db.commit()
            db.refresh(p2_user)
        else:
            if not p2_user.patient_id:
                p2_user.patient_id = 2
                db.commit()

        patient2_token = create_access_token({
            "user_id": p2_user.id,
            "sub": str(p2_user.id),
            "role": "PATIENT",
            "patient_id": p2_user.patient_id or 2,
            "phone": p2_user.phone
        })

        # 5. Ensure Session 1 and Summary 1 exist for Patient 1
        from app.models import KioskSession, ClinicalSummary, ClinicalHistoryEntry
        sess1 = db.query(KioskSession).filter(KioskSession.id == 1).first()
        if not sess1:
            sess1 = KioskSession(
                id=1,
                patient_id=1,
                language="en",
                ayush_mode=False,
                consent_given=True
            )
            db.add(sess1)
            db.commit()
            db.refresh(sess1)

        summary1 = db.query(ClinicalSummary).filter(ClinicalSummary.session_id == 1).first()
        if not summary1:
            summary1 = ClinicalSummary(
                session_id=1,
                chief_complaint="Fever and mild headache",
                hpi="Patient reports mild fever for 2 days.",
                past_medical_surgical="None",
                doctor_verified=False
            )
            db.add(summary1)
            db.commit()

        entry1 = db.query(ClinicalHistoryEntry).filter(ClinicalHistoryEntry.session_id == 1).first()
        if not entry1:
            entry1 = ClinicalHistoryEntry(
                session_id=1,
                section="chief_complaint",
                question="What brings you in today?",
                response="Mild fever for 2 days.",
                input_type="text"
            )
            db.add(entry1)
            db.commit()

        return admin_token, doctor_token, patient1_token, patient2_token
    finally:
        db.close()


# ==============================================================================
# TEST 1: OTP EXPOSED IN API RESPONSE (MUST NEVER BE RETURNED)
# ==============================================================================
def test_issue_1_otp_never_returned_in_api_response():
    """Verify that send-otp endpoints NEVER return the OTP in the JSON response."""
    # 1. Patient send-otp
    resp = client.post("/api/v1/auth/patient/send-otp", json={"phone": "9800000001", "purpose": "LOGIN"})
    if resp.status_code == 200:
        data = resp.json()
        assert "dev_mock_otp" not in data, "dev_mock_otp MUST NOT be in response"
        assert "otp" not in data, "otp MUST NOT be in response"
        assert "otp_code" not in data, "otp_code MUST NOT be in response"
        assert "code" not in data, "code MUST NOT be in response"
        assert data.get("success") is True or "cooldown_seconds" in data

    # 2. Doctor send-otp
    resp_doc = client.post("/api/v1/auth/doctor/send-otp", json={"phone": "9876500001", "purpose": "LOGIN"})
    if resp_doc.status_code == 200:
        data_doc = resp_doc.json()
        assert "dev_mock_otp" not in data_doc, "dev_mock_otp MUST NOT be in response"
        assert "otp" not in data_doc, "otp MUST NOT be in response"
        assert "otp_code" not in data_doc, "otp_code MUST NOT be in response"

    # 3. Doctor-patient send-otp
    _, doctor_token, _, _ = get_or_create_tokens()
    doc_headers = {"Authorization": f"Bearer {doctor_token}"}
    resp_dp = client.post("/api/v1/doctor/patients/send-otp", json={"phone": "9800000002"}, headers=doc_headers)
    if resp_dp.status_code == 200:
        data_dp = resp_dp.json()
        assert "dev_mock_otp" not in data_dp, "dev_mock_otp MUST NOT be in response"
        assert "otp" not in data_dp, "otp MUST NOT be in response"


# ==============================================================================
# TEST 2: REMOVE ALL OTP BYPASS VALUES
# ==============================================================================
def test_issue_2_otp_bypass_prohibited_in_production():
    """Verify that in production mode, hardcoded OTPs (123456, 000000) are rejected."""
    # Temporarily simulate production environment
    original_app_env = settings.APP_ENV
    original_otp_mode = settings.OTP_MODE
    try:
        settings.APP_ENV = "production"
        settings.OTP_MODE = "production"

        db = SessionLocal()
        db.query(OTPVerification).filter(OTPVerification.phone.in_(["9876543210", "9876500001"])).delete()
        db.commit()
        db.close()

        # Legitimate OTP request created first for Ramesh Kumar
        res_send = client.post("/api/v1/auth/patient/send-otp", json={"phone": "9876543210", "purpose": "LOGIN"})
        assert res_send.status_code == 200

        # Attempt to verify with 123456
        resp = client.post("/api/v1/auth/patient/verify-login", json={"phone": "9876543210", "otp": "123456"})
        assert resp.status_code == 400, "In production, hardcoded OTP 123456 must be rejected!"
        assert any(w in resp.json().get("detail", "") for w in ["Incorrect", "Invalid"])

        # Attempt to verify with 000000
        resp_zero = client.post("/api/v1/auth/patient/verify-login", json={"phone": "9876543210", "otp": "000000"})
        assert resp_zero.status_code == 400, "In production, hardcoded OTP 000000 must be rejected!"
        assert any(w in resp_zero.json().get("detail", "") for w in ["Incorrect", "Invalid"])

        # Doctor verify-login with 123456
        res_doc_send = client.post("/api/v1/auth/doctor/send-otp", json={"phone": "9876500001", "purpose": "LOGIN"})
        assert res_doc_send.status_code == 200
        resp_doc = client.post("/api/v1/auth/doctor/verify-login", json={"phone": "9876500001", "otp": "123456"})
        assert resp_doc.status_code == 400, "In production, doctor hardcoded OTP 123456 must be rejected!"
        assert any(w in resp_doc.json().get("detail", "") for w in ["Incorrect", "Invalid"])

    finally:
        settings.APP_ENV = original_app_env
        settings.OTP_MODE = original_otp_mode

def test_issue_2_fail_fast_on_insecure_otp_mode():
    """Verify application raises RuntimeError if production has OTP_MODE=development."""
    insecure_settings = Settings(
        APP_ENV="production",
        OTP_MODE="development",
        DEV_MOCK_OTP="",
        SECRET_KEY="a" * 32,
        CORS_ORIGINS="http://localhost:5173"
    )
    with pytest.raises(RuntimeError) as exc_info:
        insecure_settings.validate_security()
    assert "OTP_MODE must be set to 'production'" in str(exc_info.value)

def test_issue_2_fail_fast_on_dev_mock_otp_in_production():
    """Verify application raises RuntimeError if DEV_MOCK_OTP is enabled in production."""
    insecure_settings = Settings(
        APP_ENV="production",
        OTP_MODE="production",
        DEV_MOCK_OTP="123456",
        SECRET_KEY="a" * 32,
        CORS_ORIGINS="http://localhost:5173"
    )
    with pytest.raises(RuntimeError) as exc_info:
        insecure_settings.validate_security()
    assert "DEV_MOCK_OTP is strictly prohibited in production" in str(exc_info.value)


# ==============================================================================
# TEST 3: REMOVE HARDCODED JWT SECRET_KEY (FAIL FAST)
# ==============================================================================
def test_issue_3_jwt_secret_key_fail_fast():
    """Verify application raises RuntimeError if SECRET_KEY is missing or default in production."""
    # Default secret in production
    bad_settings = Settings(
        APP_ENV="production",
        OTP_MODE="production",
        DEV_MOCK_OTP="",
        SECRET_KEY="medikiosk_secret_key_2026_india_health",
        CORS_ORIGINS="http://localhost:5173"
    )
    with pytest.raises(RuntimeError) as exc_info:
        bad_settings.validate_security()
    assert "SECRET_KEY must be configured in production" in str(exc_info.value)

    # Short secret in production
    short_settings = Settings(
        APP_ENV="production",
        OTP_MODE="production",
        DEV_MOCK_OTP="",
        SECRET_KEY="too_short_secret",
        CORS_ORIGINS="http://localhost:5173"
    )
    with pytest.raises(RuntimeError) as exc_info:
        short_settings.validate_security()
    assert "minimum 32 characters" in str(exc_info.value)

    # Valid secret in production
    valid_settings = Settings(
        APP_ENV="production",
        OTP_MODE="production",
        DEV_MOCK_OTP="",
        SECRET_KEY="super_secret_random_key_that_is_at_least_32_characters_long",
        CORS_ORIGINS="http://localhost:5173"
    )
    # Should not raise
    valid_settings.validate_security()


# ==============================================================================
# TEST 4: PROTECT ALL ADMIN ENDPOINTS
# ==============================================================================
def test_issue_4_protect_all_admin_endpoints():
    """Verify /admin/db/* endpoints require authentication and ADMIN role."""
    admin_token, doctor_token, patient1_token, _ = get_or_create_tokens()

    admin_endpoints = [
        "/api/v1/admin/db/stats",
        "/api/v1/admin/db/export"
    ]

    for ep in admin_endpoints:
        # 1. Unauthenticated -> 401
        res_unauth = client.get(ep)
        assert res_unauth.status_code == 401, f"{ep} must return 401 without auth"

        # 2. Patient token -> 403 Forbidden
        res_patient = client.get(ep, headers={"Authorization": f"Bearer {patient1_token}"})
        assert res_patient.status_code == 403, f"{ep} must return 403 for PATIENT"

        # 3. Doctor token -> 403 Forbidden
        res_doc = client.get(ep, headers={"Authorization": f"Bearer {doctor_token}"})
        assert res_doc.status_code == 403, f"{ep} must return 403 for DOCTOR"

        # 4. Admin token -> 200 OK
        res_admin = client.get(ep, headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin.status_code == 200, f"{ep} must return 200 for ADMIN"


# ==============================================================================
# TEST 5: UNAUTHENTICATED MEDICAL HISTORY ENDPOINTS PROTECTED
# ==============================================================================
def test_issue_5_protect_medical_history_endpoints():
    """Verify medical history and session endpoints require auth & authorization."""
    _, doctor_token, patient1_token, patient2_token = get_or_create_tokens()

    # Patient 1 history
    ep_history = "/api/v1/patients/1/history"

    # 1. Unauthenticated -> 401
    assert client.get(ep_history).status_code == 401

    # 2. Patient 2 accessing Patient 1 history -> 403
    res_p2 = client.get(ep_history, headers={"Authorization": f"Bearer {patient2_token}"})
    assert res_p2.status_code == 403

    # 3. Patient 1 accessing own history -> 200
    res_p1 = client.get(ep_history, headers={"Authorization": f"Bearer {patient1_token}"})
    assert res_p1.status_code == 200

    # Summary, FHIR, and Session history endpoints
    assert client.get("/api/v1/summary/session/1").status_code == 401
    assert client.get("/api/v1/summary/session/1", headers={"Authorization": f"Bearer {patient2_token}"}).status_code == 403
    assert client.get("/api/v1/summary/session/1", headers={"Authorization": f"Bearer {patient1_token}"}).status_code in [200, 404]

    assert client.get("/api/v1/fhir/export/1").status_code == 401
    assert client.get("/api/v1/fhir/export/1", headers={"Authorization": f"Bearer {patient2_token}"}).status_code == 403
    assert client.get("/api/v1/fhir/export/1", headers={"Authorization": f"Bearer {patient1_token}"}).status_code in [200, 404]

    assert client.get("/api/v1/history/session/1/entries").status_code == 401
    assert client.get("/api/v1/history/session/1/entries", headers={"Authorization": f"Bearer {patient2_token}"}).status_code == 403
    assert client.get("/api/v1/history/session/1/entries", headers={"Authorization": f"Bearer {patient1_token}"}).status_code == 200


# ==============================================================================
# TEST 6: UNAUTHENTICATED DOCUMENT / REPORT ENDPOINTS PROTECTED
# ==============================================================================
def test_issue_6_protect_document_and_report_endpoints():
    """Verify document/report endpoints require authentication and authorization."""
    _, _, patient1_token, patient2_token = get_or_create_tokens()

    ep_reports = "/api/v1/patients/1/reports"

    # 1. Unauthenticated -> 401
    assert client.get(ep_reports).status_code == 401

    # 2. Patient 2 accessing Patient 1 reports -> 403
    assert client.get(ep_reports, headers={"Authorization": f"Bearer {patient2_token}"}).status_code == 403

    # 3. Patient 1 accessing own reports -> 200
    assert client.get(ep_reports, headers={"Authorization": f"Bearer {patient1_token}"}).status_code == 200


# ==============================================================================
# TEST 7: JWT TOKEN IN URL QUERY PARAMETER REJECTED
# ==============================================================================
def test_issue_7_reject_jwt_in_url_query_param():
    """Verify report view/download endpoints reject ?token= and require Authorization header."""
    _, _, patient1_token, _ = get_or_create_tokens()

    # Request report view with ?token= in URL and NO Authorization header -> 401
    res_view_query = client.get(f"/api/v1/patients/1/reports/1/view?token={patient1_token}")
    assert res_view_query.status_code == 401, "Passing JWT in query parameter ?token= must be rejected with 401"

    # Request report download with ?token= in URL and NO Authorization header -> 401
    res_down_query = client.get(f"/api/v1/patients/1/reports/1/download?token={patient1_token}")
    assert res_down_query.status_code == 401, "Passing JWT in download query parameter ?token= must be rejected with 401"

    # Request with proper Authorization header -> 200 (or file response)
    res_view_auth = client.get("/api/v1/patients/1/reports/1/view", headers={"Authorization": f"Bearer {patient1_token}"})
    assert res_view_auth.status_code in [200, 404], f"With Bearer header, should authenticate successfully (got {res_view_auth.status_code})"


# ==============================================================================
# TEST 8: HTTPS & SECURITY TRANSPORT ENFORCEMENT
# ==============================================================================
def test_issue_8_security_transport_headers():
    """Verify security headers (nosniff, frame-options, XSS, CSP) are present on responses."""
    resp = client.get("/health")
    assert resp.status_code == 200
    headers = resp.headers

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") in ["SAMEORIGIN", "DENY"]
    assert "1; mode=block" in headers.get("x-xss-protection", "")
    assert "strict-origin-when-cross-origin" in headers.get("referrer-policy", "")
    assert "content-security-policy" in headers
    assert "permissions-policy" in headers

def test_issue_8_https_redirection_when_enforced():
    """Verify HTTP requests are redirected when ENFORCE_HTTPS is True."""
    original_enforce = settings.ENFORCE_HTTPS
    try:
        settings.ENFORCE_HTTPS = True
        resp = client.get("/health", headers={"x-forwarded-proto": "http"}, follow_redirects=False)
        assert resp.status_code in [307, 308]
        assert resp.headers["location"].startswith("https://")
    finally:
        settings.ENFORCE_HTTPS = original_enforce


# ==============================================================================
# TEST 9: WILDCARD CORS FORBIDDEN & STRICT WHITELIST ENFORCED
# ==============================================================================
def test_issue_9_cors_wildcard_forbidden_in_production():
    """Verify Settings raises RuntimeError if CORS_ORIGINS has '*' in production."""
    wildcard_settings = Settings(
        APP_ENV="production",
        OTP_MODE="production",
        DEV_MOCK_OTP="",
        SECRET_KEY="super_secret_random_key_that_is_at_least_32_characters_long",
        CORS_ORIGINS="*"
    )
    with pytest.raises(RuntimeError) as exc_info:
        wildcard_settings.validate_security()
    assert "Wildcard CORS origin '*' is strictly prohibited in production" in str(exc_info.value)

def test_issue_9_cors_whitelist_enforced():
    """Verify whitelisted origin is allowed and non-whitelisted is blocked."""
    # Whitelisted origin
    resp_whitelisted = client.options(
        "/api/v1/auth/patient/send-otp",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST"
        }
    )
    assert resp_whitelisted.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Untrusted / attacker origin
    resp_attacker = client.options(
        "/api/v1/auth/patient/send-otp",
        headers={
            "Origin": "http://malicious-attacker.com",
            "Access-Control-Request-Method": "POST"
        }
    )
    assert resp_attacker.headers.get("access-control-allow-origin") != "http://malicious-attacker.com"


if __name__ == "__main__":
    pytest.main(["-v", __file__])
