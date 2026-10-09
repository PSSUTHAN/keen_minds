import requests
import time
import sqlite3

BASE_URL = "http://127.0.0.1:8000/api/v1"

def reset_otp_table():
    try:
        conn = sqlite3.connect("medikiosk.db")
        conn.execute("DELETE FROM otp_verifications")
        conn.commit()
        conn.close()
    except Exception as e:
        print("Note on DB cleanup:", e)

def test_full_otp_and_rbac_lifecycle():
    print("\n--- 1. Testing Patient OTP Registration ---")
    reg_phone = f"9988{int(time.time()) % 1000000:06d}"
    print(f"Registering new patient with phone: {reg_phone}")
    
    # Request OTP for registration
    resp = requests.post(f"{BASE_URL}/auth/patient/send-otp", json={"phone": reg_phone, "purpose": "REGISTER"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["phone"] == reg_phone
    otp_code = data.get("demo_otp") or data.get("dev_mock_otp", "123456")
    print(f"OTP sent for registration: {otp_code}")

    # Cooldown check: Immediate second request should be rate-limited (cooldown)
    resp_rate_limit = requests.post(f"{BASE_URL}/auth/patient/send-otp", json={"phone": reg_phone, "purpose": "REGISTER"})
    assert resp_rate_limit.status_code == 429, f"Expected 429, got {resp_rate_limit.status_code}"
    print("Rate-limiting cooldown correctly enforced: 429 Too Many Requests")

    # Verify registration with wrong OTP
    resp_bad = requests.post(f"{BASE_URL}/auth/patient/verify-register", json={
        "full_name": "Test Reg Patient",
        "dob": "1990-01-01",
        "gender": "Female",
        "phone": reg_phone,
        "email": "testreg@example.com",
        "blood_group": "B+",
        "address": "123 Test Street",
        "emergency_contact": "9988770000",
        "preferred_language": "en",
        "otp": "999999"
    })
    assert resp_bad.status_code == 400
    print("Invalid OTP correctly rejected: 400 Bad Request")

    # Verify registration with correct OTP
    resp_reg = requests.post(f"{BASE_URL}/auth/patient/verify-register", json={
        "full_name": "Test Reg Patient",
        "dob": "1990-01-01",
        "gender": "Female",
        "phone": reg_phone,
        "email": "testreg@example.com",
        "blood_group": "B+",
        "address": "123 Test Street",
        "emergency_contact": "9988770000",
        "preferred_language": "en",
        "otp": otp_code
    })
    assert resp_reg.status_code == 200, resp_reg.text
    reg_data = resp_reg.json()
    new_patient_token = reg_data["access_token"]
    new_patient_id = reg_data["user_data"]["id"]
    assert reg_data["role"] == "PATIENT"
    print(f"Patient registered successfully: #{new_patient_id} with JWT role PATIENT")

    # OTP reuse check: cannot reuse verified OTP
    resp_reuse = requests.post(f"{BASE_URL}/auth/patient/verify-register", json={
        "full_name": "Duplicate Test",
        "dob": "1990-01-01",
        "gender": "Female",
        "phone": reg_phone,
        "otp": otp_code
    })
    assert resp_reuse.status_code in [400, 429]
    print("OTP reuse prevented!")

    print("\n--- 2. Testing Patient Login with OTP ---")
    reset_otp_table()
    # Patient Login for existing Ramesh Kumar (9876543210)
    ramesh_phone = "9876543210"
    resp = requests.post(f"{BASE_URL}/auth/patient/send-otp", json={"phone": ramesh_phone, "purpose": "LOGIN"})
    assert resp.status_code == 200, resp.text
    ramesh_otp = resp.json().get("demo_otp") or resp.json().get("dev_mock_otp", "123456")
    
    resp_login = requests.post(f"{BASE_URL}/auth/patient/verify-login", json={"phone": ramesh_phone, "otp": ramesh_otp})
    assert resp_login.status_code == 200, resp_login.text
    patient_token = resp_login.json()["access_token"]
    print("Patient Ramesh Kumar logged in with OTP successfully.")

    patient_headers = {"Authorization": f"Bearer {patient_token}"}

    # Patient accessing own medical record -> Permitted
    resp_rec = requests.get(f"{BASE_URL}/patients/1/record", headers=patient_headers)
    assert resp_rec.status_code == 200, resp_rec.text
    rec_data = resp_rec.json()
    assert rec_data["patient_info"]["name"] == "Ramesh Kumar"
    if rec_data["current_prescription"]:
        # Patient CANNOT edit current prescription
        assert rec_data["current_prescription"]["can_edit"] is False
    print("Patient can view own record; prescription is marked can_edit=False.")

    # Patient attempting to edit prescription -> FORBIDDEN 403
    curr_rx_id = rec_data["current_prescription"]["id"] if rec_data["current_prescription"] else 1
    resp_patient_edit = requests.put(f"{BASE_URL}/prescriptions/{curr_rx_id}", headers=patient_headers, json={
        "diagnosis": "Malicious Diagnosis Update by Patient"
    })
    assert resp_patient_edit.status_code == 403
    print("Security Check Passed: Patient PUT /prescriptions returns 403 Forbidden.")

    # Patient attempting to search doctor patient database -> FORBIDDEN 403
    resp_patient_search = requests.get(f"{BASE_URL}/patients/search?q=Ramesh", headers=patient_headers)
    assert resp_patient_search.status_code == 403
    print("Security Check Passed: Patient GET /patients/search returns 403 Forbidden.")

    print("\n--- 3. Testing Doctor OTP Authentication ---")
    reset_otp_table()
    # Doctor A: Dr. Rajesh Sharma (9876500001)
    resp = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": "9876500001", "role": "DOCTOR"})
    assert resp.status_code == 200, resp.text
    doc_a_otp = resp.json().get("demo_otp") or resp.json().get("dev_mock_otp", "123456")
    resp_doc_a = requests.post(f"{BASE_URL}/auth/doctor/verify-login", json={"phone": "9876500001", "otp": doc_a_otp, "role": "DOCTOR"})
    assert resp_doc_a.status_code == 200, resp_doc_a.text
    doc_a_token = resp_doc_a.json()["access_token"]
    doc_a_headers = {"Authorization": f"Bearer {doc_a_token}"}
    print("Doctor A (Dr. Rajesh Sharma) authenticated with DOCTOR role.")

    reset_otp_table()
    # Doctor B: Dr. Ananya Sundaram (9876500002)
    resp = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": "9876500002", "role": "DOCTOR"})
    assert resp.status_code == 200, resp.text
    doc_b_otp = resp.json().get("demo_otp") or resp.json().get("dev_mock_otp", "123456")
    resp_doc_b = requests.post(f"{BASE_URL}/auth/doctor/verify-login", json={"phone": "9876500002", "otp": doc_b_otp, "role": "DOCTOR"})
    assert resp_doc_b.status_code == 200, resp_doc_b.text
    doc_b_token = resp_doc_b.json()["access_token"]
    doc_b_headers = {"Authorization": f"Bearer {doc_b_token}"}
    print("Doctor B (Dr. Ananya Sundaram) authenticated with DOCTOR role.")

    # Verify Patient cannot authenticate as Doctor
    resp_fake_doc = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": ramesh_phone, "role": "DOCTOR"})
    assert resp_fake_doc.status_code in [403, 404]
    print("Role Enforcement: Patient phone cannot send OTP as Doctor.")

    print("\n--- 4. Testing Doctor Patient Search & Record Retrieval ---")
    resp_search = requests.get(f"{BASE_URL}/patients/search?q=Ramesh", headers=doc_a_headers)
    assert resp_search.status_code == 200
    results = resp_search.json()
    assert len(results) > 0
    assert results[0]["name"] == "Ramesh Kumar"
    print(f"Doctor A successfully searched patients: found {len(results)} matches.")

    # Doctor A views Ramesh Kumar's 4-section medical record
    resp_doc_rec = requests.get(f"{BASE_URL}/patients/1/record", headers=doc_a_headers)
    assert resp_doc_rec.status_code == 200
    doc_rec_data = resp_doc_rec.json()
    assert "patient_info" in doc_rec_data
    assert "past_medical_history" in doc_rec_data
    assert "current_prescription" in doc_rec_data
    assert isinstance(doc_rec_data["past_medical_history"], list)
    print(f"4-Section Medical Record retrieved successfully ({len(doc_rec_data['past_medical_history'])} past history entries).")

    print("\n--- 5. Testing Prescription Ownership & Editing Rules (CRITICAL REQUIREMENT #8) ---")
    # Current prescription for Ramesh Kumar was created by Doctor A (Dr. Rajesh Sharma, ID 1)
    rx = doc_rec_data["current_prescription"]
    if not rx:
        # Create an active one if none
        resp_create = requests.post(f"{BASE_URL}/prescriptions/patient/1", headers=doc_a_headers, json={
            "diagnosis": "Type 2 Diabetes Mellitus with Essential Hypertension",
            "doctor_notes": "Clinical follow-up in 2 weeks",
            "items": [
                {"medicine_name": "Metformin 500mg", "dosage": "1 tablet", "frequency": "Twice daily", "duration": "30 days", "instructions": "After food"}
            ]
        })
        assert resp_create.status_code == 200
        rx = resp_create.json()

    rx_id = rx["id"]
    # Check Doctor A view has can_edit == True
    resp_chk_a = requests.get(f"{BASE_URL}/patients/1/record", headers=doc_a_headers)
    assert resp_chk_a.json()["current_prescription"]["can_edit"] is True
    print("Doctor A can_edit check: True (Owner = Dr. Rajesh Sharma)")

    # Doctor A edits the prescription -> Permitted (200 OK)
    resp_edit_a = requests.put(f"{BASE_URL}/prescriptions/{rx_id}", headers=doc_a_headers, json={
        "diagnosis": "Type 2 Diabetes with Grade 1 Hypertension - Updated by Dr. Rajesh",
        "doctor_notes": "Modified dosage after clinical follow-up.",
        "items": [
          {"medicine_name": "Metformin 500mg", "dosage": "1 tablet", "frequency": "Twice daily", "duration": "10 days", "instructions": "After food"},
          {"medicine_name": "Telmisartan 40mg", "dosage": "1 tablet", "frequency": "Once daily", "duration": "30 days", "instructions": "Morning after food"}
        ]
    })
    assert resp_edit_a.status_code == 200, resp_edit_a.text
    assert resp_edit_a.json()["diagnosis"] == "Type 2 Diabetes with Grade 1 Hypertension - Updated by Dr. Rajesh"
    print("Doctor A (Owner) successfully updated prescription: 200 OK.")

    # Doctor B views Ramesh Kumar's medical record
    resp_doc_b_rec = requests.get(f"{BASE_URL}/patients/1/record", headers=doc_b_headers)
    assert resp_doc_b_rec.status_code == 200
    doc_b_rec_data = resp_doc_b_rec.json()
    assert doc_b_rec_data["current_prescription"]["can_edit"] is False
    print("Doctor B can_edit check: False (Non-owner = Dr. Ananya Sundaram)")

    # Doctor B attempts to edit Doctor A's prescription -> MUST RETURN 403 FORBIDDEN!
    resp_edit_b = requests.put(f"{BASE_URL}/prescriptions/{rx_id}", headers=doc_b_headers, json={
        "diagnosis": "Malicious Modification by Doctor B"
    })
    assert resp_edit_b.status_code == 403, f"Expected 403 Forbidden, got {resp_edit_b.status_code}"
    print(f"Doctor B edit attempt strictly rejected by backend: {resp_edit_b.status_code} Forbidden ({resp_edit_b.json()['detail']})")

    print("\n--- 6. Testing Prescription Lifecycle & Historical Immutability ---")
    # Doctor A creates a new prescription for Ramesh Kumar
    resp_new_rx = requests.post(f"{BASE_URL}/prescriptions/patient/1", headers=doc_a_headers, json={
        "diagnosis": "Seasonal Viral Pharyngitis",
        "doctor_notes": "Hydration and rest advised.",
        "items": [
          {"medicine_name": "Paracetamol 650mg", "dosage": "1 tablet", "frequency": "Thrice daily", "duration": "3 days", "instructions": "After food"}
        ]
    })
    assert resp_new_rx.status_code == 200
    new_rx_data = resp_new_rx.json()
    new_rx_id = new_rx_data["id"]
    print(f"New prescription created: {new_rx_data['prescription_number']} (ACTIVE).")

    # Check that previous prescription was automatically archived to COMPLETED and moved to history
    resp_updated_rec = requests.get(f"{BASE_URL}/patients/1/record", headers=doc_a_headers)
    updated_rec_data = resp_updated_rec.json()
    assert updated_rec_data["current_prescription"]["id"] == new_rx_id
    history_ids = [h["id"] for h in updated_rec_data["prescription_history"]]
    assert rx_id in history_ids
    print(f"Previous prescription #{rx_id} successfully moved to immutable Prescription History.")

    # Historical prescriptions cannot be edited, even by their creator
    resp_edit_historical = requests.put(f"{BASE_URL}/prescriptions/{rx_id}", headers=doc_a_headers, json={
        "diagnosis": "Attempt to edit historical prescription"
    })
    assert resp_edit_historical.status_code == 400
    print(f"Historical prescription edit attempt rejected: 400 Bad Request ({resp_edit_historical.json()['detail']})")

    print("\n==========================================")
    print("ALL RBAC AND OTP LIFECYCLE TESTS PASSED! ")
    print("==========================================")

if __name__ == "__main__":
    test_full_otp_and_rbac_lifecycle()
