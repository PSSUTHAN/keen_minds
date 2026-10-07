import sys
import os
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_tests():
    print("==================================================")
    print("RUNNING COMPLETE DOCTOR AUTH & DASHBOARD TEST SUITE")
    print("==================================================")

    # 1. DOCTOR LOGIN FLOW
    print("\n--- Test 1: Doctor Login Flow ---")
    # Check unregistered doctor
    unreg_phone = "9876599990"
    res = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": unreg_phone, "purpose": "LOGIN", "role": "DOCTOR"})
    assert res.status_code == 404, f"Expected 404 for unregistered doctor, got {res.status_code}: {res.text}"
    assert "not found" in res.json().get("detail", "").lower(), f"Unexpected message: {res.text}"
    print("[PASS] Unregistered doctor correctly rejected with 404 (no OTP sent)")

    # Helper to send OTP with cooldown handling
    def post_otp(url, payload):
        import time
        r = requests.post(url, json=payload)
        if r.status_code == 429:
            print("  [Waiting 8s for rate limit cooldown...]")
            time.sleep(8)
            r = requests.post(url, json=payload)
        return r

    # Registered doctor (Dr. Rajesh Sharma)
    doc_phone = "9876500001"
    res = post_otp(f"{BASE_URL}/auth/doctor/send-otp", {"phone": doc_phone, "purpose": "LOGIN", "role": "DOCTOR"})
    assert res.status_code == 200, f"Expected 200 for registered doctor, got {res.status_code}: {res.text}"
    otp_data = res.json()
    print(f"[PASS] Registered doctor OTP sent: {otp_data['message']}")

    # Verify OTP
    res = requests.post(f"{BASE_URL}/auth/doctor/verify-login", json={"phone": doc_phone, "otp": "123456", "role": "DOCTOR"})
    assert res.status_code == 200, f"Failed doctor verify: {res.text}"
    doc_auth = res.json()
    doc_token = doc_auth["access_token"]
    assert doc_auth["role"] == "DOCTOR", "Role should be DOCTOR"
    print(f"[PASS] Dr. {doc_auth['name']} logged in successfully with DOCTOR role!")

    headers = {"Authorization": f"Bearer {doc_token}"}

    # 2. DOCTOR REGISTRATION FLOW
    print("\n--- Test 2: Doctor Registration Flow ---")
    # Verify duplicate doctor rejection
    res_dup = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": "9876500001", "purpose": "REGISTER", "role": "DOCTOR"})
    assert res_dup.status_code == 400 and "already exists" in res_dup.text
    print("[PASS] Duplicate doctor registration mobile correctly rejected (400 Bad Request)")

    import time
    ts = int(time.time()) % 100000
    new_doc_phone = f"98761{ts:05d}"
    new_reg_no = f"MCI-2026-{ts:05d}"

    # Send registration OTP
    res = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": new_doc_phone, "purpose": "REGISTER", "role": "DOCTOR"})
    assert res.status_code == 200, f"Failed registration send OTP: {res.text}"
    print(f"[PASS] Registration OTP sent to +91 {new_doc_phone}")

    # Verify & Register
    reg_payload = {
        "name": "Dr. Vikram Seth",
        "phone": new_doc_phone,
        "email": f"dr.vikram.{ts}@medikiosk.in",
        "registration_no": new_reg_no,
        "specialty": "Cardiology & Cardiovascular Diseases",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experience_years": 15,
        "hospital_name": "MediKiosk Cardiac Centre",
        "department": "Department of Cardiology",
        "otp": "123456"
    }
    res = requests.post(f"{BASE_URL}/auth/doctor/verify-register", json=reg_payload)
    assert res.status_code == 200, f"Failed doctor registration: {res.text}"
    new_doc_auth = res.json()
    assert new_doc_auth["role"] == "DOCTOR"
    print(f"[PASS] Dr. {new_doc_auth['name']} registered successfully with role DOCTOR!")

    # 3. DOCTOR DASHBOARD STATS
    print("\n--- Test 3: Doctor Dashboard Stats ---")
    res = requests.get(f"{BASE_URL}/doctor/dashboard-stats", headers=headers)
    assert res.status_code == 200, f"Failed stats fetch: {res.text}"
    stats = res.json()
    print(f"[PASS] Stats: Viewed Patients = {stats['viewed_patients_count']}, Today = {stats['today_patients_count']}, Active Cases = {stats['active_cases_count']}")
    assert "doctor" in stats and stats["doctor"] is not None

    # 4. VIEWED PATIENTS
    print("\n--- Test 4: Viewed Patients List ---")
    res = requests.get(f"{BASE_URL}/doctor/viewed-patients", headers=headers)
    assert res.status_code == 200, f"Failed viewed patients fetch: {res.text}"
    v_patients = res.json()
    print(f"[PASS] Found {len(v_patients)} viewed patients for Dr. Rajesh Sharma.")
    if v_patients:
        p0 = v_patients[0]
        print(f"  - First viewed: {p0['name']} (ID: {p0['formatted_patient_id']}, Last Viewed: {p0['last_viewed_display']})")

    # 5. PATIENT SEARCH
    print("\n--- Test 5: Patient Search ---")
    res = requests.get(f"{BASE_URL}/patients/search?q=Ramesh", headers=headers)
    assert res.status_code == 200, f"Search failed: {res.text}"
    search_results = res.json()
    assert len(search_results) > 0, "Expected at least 1 patient"
    p_id = search_results[0]["id"]
    print(f"[PASS] Search returned {len(search_results)} patients. Testing with Patient ID #{p_id}")

    # 6. OPEN PATIENT MEDICAL RECORD (UPSERTS VIEWED ENTRY)
    print("\n--- Test 6: Open Patient Medical Record ---")
    res = requests.get(f"{BASE_URL}/patients/{p_id}/record", headers=headers)
    assert res.status_code == 200, f"Record load failed: {res.text}"
    rec = res.json()
    print(f"[PASS] Patient record loaded: {rec['patient_info']['name']}")
    assert "past_medical_history" in rec
    assert "medical_reports" in rec
    assert "current_prescription" in rec

    # 7. ADD PATIENT BY MOBILE & PATIENT OTP VERIFICATION FLOW
    print("\n--- Test 7: Add Patient by Mobile & Patient OTP Verification Flow ---")
    
    # 7A: Case A - Patient Not Found
    res = requests.post(f"{BASE_URL}/doctor/patients/check", json={"phone": "9999900000"}, headers=headers)
    assert res.status_code == 200, f"Check failed: {res.text}"
    check_not_found = res.json()
    assert check_not_found["status"] == "NOT_FOUND", f"Expected NOT_FOUND, got {check_not_found}"
    assert check_not_found["exists"] is False
    assert "must register" in check_not_found["message"].lower()
    print("[PASS] Case A: Unregistered phone correctly returned 'NOT_FOUND' with registration guidance.")

    # 7B: Case B - Patient Already Added (Ramesh Kumar is already linked to Dr. Rajesh)
    res = requests.post(f"{BASE_URL}/doctor/patients/check", json={"phone": "9876543210"}, headers=headers)
    assert res.status_code == 200, f"Check failed: {res.text}"
    check_already_added = res.json()
    assert check_already_added["status"] == "ALREADY_ADDED", f"Expected ALREADY_ADDED, got {check_already_added}"
    assert check_already_added["already_added"] is True
    assert check_already_added["patient"]["name"] == "Ramesh Kumar"
    print(f"[PASS] Case B: Linked patient correctly returned 'ALREADY_ADDED' ({check_already_added['patient']['name']}, ID: {check_already_added['patient']['formatted_id']})")

    # 7C: Register a patient via Patient Registration
    pt_phone = f"98722{ts:05d}"
    res = requests.post(f"{BASE_URL}/auth/patient/send-otp", json={"phone": pt_phone, "purpose": "REGISTER", "role": "PATIENT"})
    assert res.status_code == 200
    res = requests.post(f"{BASE_URL}/auth/patient/verify-register", json={
        "name": "Kavitha Raman",
        "phone": pt_phone,
        "dob": "1994-08-20",
        "gender": "Female",
        "blood_group": "B+",
        "email": f"kavitha.{ts}@example.com",
        "otp": "123456"
    })
    assert res.status_code == 200, f"Patient registration failed: {res.text}"
    body = res.json()
    kavitha_id = body.get("patient_id") or body.get("patient", {}).get("id") or body.get("user_data", {}).get("id")
    print(f"[PASS] Unlinked patient 'Kavitha Raman' registered in MediKiosk (ID: PT-{kavitha_id:03d}, Phone: +91 {pt_phone}).")

    # 7D: Security Check - Doctor CANNOT view Kavitha's medical record BEFORE OTP verification
    unauthorized_view = requests.get(f"{BASE_URL}/patients/{kavitha_id}/record", headers=headers)
    assert unauthorized_view.status_code == 403, f"Expected 403 Forbidden before OTP verification, got {unauthorized_view.status_code}: {unauthorized_view.text}"
    print(f"[PASS] Security Rule Verified: Doctor blocked from viewing unverified patient's record (403 Forbidden: {unauthorized_view.json()['detail']}).")

    # 7E: Case C - Patient Found (Registered but not yet linked to Dr. Rajesh)
    res = requests.post(f"{BASE_URL}/doctor/patients/check", json={"phone": pt_phone}, headers=headers)
    assert res.status_code == 200, f"Check failed: {res.text}"
    check_found = res.json()
    assert check_found["status"] == "FOUND", f"Expected FOUND, got {check_found}"
    assert check_found["patient"]["name"] == "Kavitha Raman"
    assert "masked_phone" in check_found["patient"]
    print(f"[PASS] Case C: Unlinked patient correctly returned 'FOUND' ({check_found['patient']['name']}, Masked: {check_found['patient']['masked_phone']}).")

    # 7F: Send OTP to Patient's registered mobile number
    res = requests.post(f"{BASE_URL}/doctor/patients/send-otp", json={"phone": pt_phone}, headers=headers)
    assert res.status_code == 200, f"Failed to send patient OTP: {res.text}"
    send_otp_res = res.json()
    assert send_otp_res["status"] == "SUCCESS"
    print(f"[PASS] Consent OTP dispatched to patient's registered mobile: {send_otp_res['masked_phone']}")

    # 7G: Verify Wrong OTP rejection
    bad_otp_res = requests.post(f"{BASE_URL}/doctor/patients/verify-otp", json={"phone": pt_phone, "otp": "999999"}, headers=headers)
    assert bad_otp_res.status_code == 400, f"Expected 400 for wrong OTP, got {bad_otp_res.status_code}"
    print("[PASS] Invalid OTP correctly rejected by backend.")

    # 7H: Verify Valid OTP & Link Patient
    verify_res = requests.post(f"{BASE_URL}/doctor/patients/verify-otp", json={"phone": pt_phone, "otp": "123456"}, headers=headers)
    assert verify_res.status_code == 200, f"Failed to verify OTP: {verify_res.text}"
    linked_patient = verify_res.json()["patient"]
    assert linked_patient["id"] == kavitha_id
    assert linked_patient["status"] == "Verified & Linked"
    print(f"[PASS] Patient PT-{kavitha_id:03d} successfully verified and linked to Dr. Rajesh Sharma!")

    # 7I: Security Check - Doctor CAN NOW view Kavitha's medical record AFTER OTP verification
    authorized_view = requests.get(f"{BASE_URL}/patients/{kavitha_id}/record", headers=headers)
    assert authorized_view.status_code == 200, f"Expected 200 after OTP verification, got {authorized_view.status_code}: {authorized_view.text}"
    print(f"[PASS] Medical record access successfully granted after OTP verification: {authorized_view.json()['patient_info']['name']}")

    # 7J: Re-checking phone now returns ALREADY_ADDED
    recheck_res = requests.post(f"{BASE_URL}/doctor/patients/check", json={"phone": pt_phone}, headers=headers)
    assert recheck_res.status_code == 200
    assert recheck_res.json()["status"] == "ALREADY_ADDED"
    print(f"[PASS] Subsequent mobile lookup for Kavitha now returns 'ALREADY_ADDED'.")

    # 7K: Patient now appears in Viewed Patients list
    v_list = requests.get(f"{BASE_URL}/doctor/viewed-patients", headers=headers).json()
    v_ids = [p["patient_id"] for p in v_list]
    assert kavitha_id in v_ids, f"Expected patient #{kavitha_id} in viewed patients, found: {v_ids}"
    print(f"[PASS] Patient #{kavitha_id} now appears in doctor's Viewed Patients / My Patients list.")

    # 8. PRESCRIPTION OWNERSHIP SECURITY CHECK
    print("\n--- Test 8: Prescription Ownership Security Check ---")
    # Send OTP then Login as Doctor 2 (Dr. Ananya Sundaram)
    res_otp2 = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": "9876500002", "purpose": "LOGIN", "role": "DOCTOR"})
    assert res_otp2.status_code == 200, f"Doctor 2 OTP failed: {res_otp2.text}"

    res = requests.post(f"{BASE_URL}/auth/doctor/verify-login", json={"phone": "9876500002", "otp": "123456", "role": "DOCTOR"})
    assert res.status_code == 200, f"Doctor 2 verify failed: {res.text}"
    doc2_token = res.json()["access_token"]
    headers_doc2 = {"Authorization": f"Bearer {doc2_token}"}

    # Fetch Ramesh's active prescription (created by Dr. Rajesh Sharma)
    res = requests.get(f"{BASE_URL}/patients/{p_id}/record", headers=headers)
    rx = res.json()["current_prescription"]
    if rx:
        rx_id = rx["id"]
        # Dr. Ananya attempts to edit Dr. Rajesh's prescription
        bad_edit = requests.put(
            f"{BASE_URL}/prescriptions/{rx_id}",
            json={
                "diagnosis": "Attempted Unauthorized Edit",
                "items": [{
                    "medicine_name": "Fake Med",
                    "morning_dose": 1,
                    "afternoon_dose": 0,
                    "night_dose": 0,
                    "duration": "5 days"
                }]
            },
            headers=headers_doc2
        )
        assert bad_edit.status_code == 403, f"Expected 403 Forbidden for non-creator doctor, got {bad_edit.status_code}: {bad_edit.text}"
        print(f"[PASS] Doctor B correctly blocked from editing Doctor A's prescription (403 Forbidden: {bad_edit.json()['detail']})")

    # 9. PATIENT AUTHENTICATION CONTINUES TO FUNCTION 100%
    print("\n--- Test 9: Patient OTP Authentication Integrity ---")
    patient_phone = "9876543220" # Sunita Devi
    res = requests.post(f"{BASE_URL}/auth/patient/send-otp", json={"phone": patient_phone, "purpose": "LOGIN", "role": "PATIENT"})
    assert res.status_code == 200, f"Patient send OTP failed: {res.text}"

    res = requests.post(f"{BASE_URL}/auth/patient/verify-login", json={"phone": patient_phone, "otp": "123456"})
    assert res.status_code == 200, f"Patient login verify failed: {res.text}"
    p_auth = res.json()
    assert p_auth["role"] == "PATIENT"
    print(f"[PASS] Patient {p_auth['name']} logged in successfully with PATIENT role!")

    print("\n==================================================")
    print("ALL TESTS PASSED 100%! DOCTOR & PATIENT SYSTEMS VERIFIED.")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
