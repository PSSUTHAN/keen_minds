import sys
import os
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_tests():
    print("======================================================================")
    print("TESTING: MediKiosk Doctor Dashboard - Available Patients & OTP Access")
    print("======================================================================")

    # 1. Doctor Login via OTP
    print("\n--- Step 1: Doctor Login via OTP ---")
    doc_phone = "9876500001" # Dr. Rajesh Sharma
    res = requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": doc_phone, "purpose": "LOGIN", "role": "DOCTOR"})
    if res.status_code == 429:
        print("  Rate limited on send-otp, attempting verify-login with existing OTP...")
    else:
        assert res.status_code == 200, f"Doctor OTP send failed: {res.text}"

    res = requests.post(f"{BASE_URL}/auth/doctor/verify-login", json={"phone": doc_phone, "otp": "123456", "role": "DOCTOR"})
    if res.status_code != 200:
        print("  Waiting 30s for cooldown...")
        time.sleep(30)
        requests.post(f"{BASE_URL}/auth/doctor/send-otp", json={"phone": doc_phone, "purpose": "LOGIN", "role": "DOCTOR"})
        res = requests.post(f"{BASE_URL}/auth/doctor/verify-login", json={"phone": doc_phone, "otp": "123456", "role": "DOCTOR"})
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    auth_data = res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Dr. {auth_data['name']} authenticated successfully.")

    # 2. Available Patients List & Privacy Verification
    print("\n--- Step 2: Fetch Available Patients List ---")
    res = requests.get(f"{BASE_URL}/doctor/patients/available", headers=headers)
    assert res.status_code == 200, f"Fetch available patients failed: {res.text}"
    raw_data = res.json()
    if isinstance(raw_data, dict):
        patients = raw_data.get("patients", [])
        total = raw_data.get("total", len(patients))
        assert total >= len(patients), "Total count should be at least patients length"
    else:
        patients = raw_data
    assert isinstance(patients, list), "Available patients should be a list"
    assert len(patients) > 0, "Should have registered patients available"
    print(f"[PASS] Retrieved {len(patients)} available patients (total: {total if isinstance(raw_data, dict) else len(patients)}).")

    # Verify Strict Privacy: NO medical history, prescriptions, diagnoses, or notes
    for p in patients:
        assert "medical_history" not in p, "Medical history must NOT be present in available patients!"
        assert "prescriptions" not in p, "Prescriptions must NOT be present in available patients!"
        assert "active_diagnosis" not in p, "Active diagnosis must NOT be present in available patients!"
        assert "reports" not in p, "Medical reports must NOT be present in available patients!"
        assert "notes" not in p, "Doctor notes must NOT be present in available patients!"
        # Verify mandatory discovery fields
        assert "patient_id" in p
        assert "formatted_patient_id" in p
        assert "name" in p
        assert "masked_phone" in p
        assert "gender" in p
        assert "age" in p
        assert "status" in p
        # Verify phone is masked
        assert "*" in p["masked_phone"] or "X" in p["masked_phone"] or len(p["masked_phone"]) <= 5, f"Phone must be masked, got: {p['masked_phone']}"

    print("[PASS] Strict Privacy Rule Verified: Zero clinical data exposed in Available Patients!")

    # 3. Search in Available Patients
    print("\n--- Step 3: Search in Available Patients ---")
    first_p = patients[0]
    res_search = requests.get(f"{BASE_URL}/doctor/patients/available", headers=headers, params={"q": first_p["name"][:3]})
    assert res_search.status_code == 200
    search_data = res_search.json()
    search_results = search_data.get("patients", []) if isinstance(search_data, dict) else search_data
    assert any(item["patient_id"] == first_p["patient_id"] for item in search_results), "Search should find target patient"
    print(f"[PASS] Search query returned {len(search_results)} match(es) for '{first_p['name'][:3]}'.")

    # 4. Strict RBAC Enforcement: Unauthorized Medical Data Access Must Return 403 Forbidden
    print("\n--- Step 4: Strict RBAC Check for Unauthorized Patient ---")
    # Find a patient whose status is 'AVAILABLE'
    target_patient = None
    for p in patients:
        if p["status"] == "AVAILABLE":
            target_patient = p
            break

    if not target_patient:
        # Create a new patient directly in DB or pick one without prior access
        print("  All current patients are authorized; creating a fresh registered patient for testing...")
        fresh_phone = f"98765{int(time.time()) % 10000:04d}0"
        # Send registration OTP
        r_otp = requests.post(f"{BASE_URL}/auth/patient/send-otp", json={"phone": fresh_phone, "purpose": "REGISTER", "role": "PATIENT"})
        assert r_otp.status_code == 200, f"Patient OTP failed: {r_otp.text}"
        # Complete patient registration
        r_reg = requests.post(f"{BASE_URL}/auth/patient/verify-register", json={
            "name": "Kavitha Raman",
            "phone": fresh_phone,
            "dob": "1994-08-15",
            "gender": "Female",
            "blood_group": "B+",
            "otp": "123456"
        })
        assert r_reg.status_code == 200, f"Patient register failed: {r_reg.text}"
        fresh_data = r_reg.json()
        target_pid = fresh_data["patient_id"]
        target_patient = {
            "patient_id": target_pid,
            "name": "Kavitha Raman",
            "masked_phone": "+91 98******10"
        }

    target_pid = target_patient["patient_id"]
    print(f"  Target Unauthorized Patient: #{target_pid} ({target_patient['name']})")

    # Test that accessing medical record returns 403 Forbidden
    res_record = requests.get(f"{BASE_URL}/patients/{target_pid}/record", headers=headers)
    assert res_record.status_code == 403, f"Expected 403 Forbidden, got {res_record.status_code}: {res_record.text}"
    print("[PASS] GET /patients/{id}/record blocked with 403 Forbidden for unauthorized doctor.")

    res_doc_details = requests.get(f"{BASE_URL}/doctor/patients/{target_pid}", headers=headers)
    assert res_doc_details.status_code == 403, f"Expected 403 Forbidden, got {res_doc_details.status_code}: {res_doc_details.text}"
    print("[PASS] GET /doctor/patients/{id} blocked with 403 Forbidden.")

    res_doc_mh = requests.get(f"{BASE_URL}/doctor/patients/{target_pid}/medical-history", headers=headers)
    assert res_doc_mh.status_code == 403, f"Expected 403 Forbidden, got {res_doc_mh.status_code}: {res_doc_mh.text}"
    print("[PASS] GET /doctor/patients/{id}/medical-history blocked with 403 Forbidden.")

    res_doc_rep = requests.get(f"{BASE_URL}/doctor/patients/{target_pid}/reports", headers=headers)
    assert res_doc_rep.status_code == 403, f"Expected 403 Forbidden, got {res_doc_rep.status_code}: {res_doc_rep.text}"
    print("[PASS] GET /doctor/patients/{id}/reports blocked with 403 Forbidden.")

    res_doc_rx = requests.get(f"{BASE_URL}/doctor/patients/{target_pid}/prescriptions", headers=headers)
    assert res_doc_rx.status_code == 403, f"Expected 403 Forbidden, got {res_doc_rx.status_code}: {res_doc_rx.text}"
    print("[PASS] GET /doctor/patients/{id}/prescriptions blocked with 403 Forbidden.")

    # 5. Request Access Flow (Dispatches OTP to PATIENT mobile)
    print("\n--- Step 5: Doctor Requests Patient Access ---")
    res_req = requests.post(f"{BASE_URL}/doctor/patients/{target_pid}/request-access", headers=headers)
    assert res_req.status_code == 200, f"Request access failed: {res_req.text}"
    req_data = res_req.json()
    assert req_data["status"] == "ACCESS_PENDING"
    assert req_data["patient_id"] == target_pid
    print(f"[PASS] Access requested. Status: ACCESS_PENDING. Dispatched to patient masked phone: {req_data['masked_phone']}")

    # Verify status in Available Patients updated to ACCESS_PENDING
    res_av = requests.get(f"{BASE_URL}/doctor/patients/available", headers=headers)
    av_json = res_av.json()
    av_list = av_json.get("patients", []) if isinstance(av_json, dict) else av_json
    patient_entry = next((p for p in av_list if p["patient_id"] == target_pid), None)
    assert patient_entry is not None
    assert patient_entry["status"] == "ACCESS_PENDING", f"Expected ACCESS_PENDING, got {patient_entry['status']}"
    print("[PASS] Patient status in Available Patients correctly shows ACCESS_PENDING.")

    # 6. Verify Access Flow via OTP
    print("\n--- Step 6: Verify Patient Access via OTP ---")
    # Bad OTP test
    res_bad = requests.post(f"{BASE_URL}/doctor/patients/{target_pid}/verify-access", headers=headers, json={"otp": "999999"})
    assert res_bad.status_code == 400, f"Expected 400 Bad Request for invalid OTP, got {res_bad.status_code}"
    print("[PASS] Invalid OTP correctly rejected with 400 Bad Request.")

    # Valid OTP (use dev mock OTP or 123456)
    valid_otp = req_data.get("dev_mock_otp") or "123456"
    res_verify = requests.post(f"{BASE_URL}/doctor/patients/{target_pid}/verify-access", headers=headers, json={"otp": valid_otp})
    assert res_verify.status_code == 200, f"Verification failed: {res_verify.text}"
    verify_data = res_verify.json()
    assert verify_data["status"] == "AUTHORIZED"
    print(f"[PASS] Access AUTHORIZED: {verify_data['message']}")

    # 7. Post-Authorization Medical Data Access Verification
    print("\n--- Step 7: Post-Authorization Medical Data Access ---")
    # Verify status in Available Patients is now AUTHORIZED
    res_av2 = requests.get(f"{BASE_URL}/doctor/patients/available", headers=headers)
    av2_json = res_av2.json()
    av2_list = av2_json.get("patients", []) if isinstance(av2_json, dict) else av2_json
    patient_entry2 = next((p for p in av2_list if p["patient_id"] == target_pid), None)
    assert patient_entry2 is not None
    assert patient_entry2["status"] == "AUTHORIZED"
    print("[PASS] Patient status in Available Patients is now AUTHORIZED.")

    # Verify patient now appears under "My Patients" (GET /doctor/viewed-patients)
    res_my = requests.get(f"{BASE_URL}/doctor/viewed-patients", headers=headers)
    assert res_my.status_code == 200
    my_patients = res_my.json()
    assert any(p["patient_id"] == target_pid for p in my_patients), f"Patient #{target_pid} should appear in My Patients!"
    print(f"[PASS] Patient #{target_pid} successfully listed in Doctor's 'My Patients' list.")

    # Verify Medical Record access now succeeds with 200 OK
    res_rec_auth = requests.get(f"{BASE_URL}/patients/{target_pid}/record", headers=headers)
    assert res_rec_auth.status_code == 200, f"Expected 200 OK after authorization, got {res_rec_auth.status_code}: {res_rec_auth.text}"
    rec_json = res_rec_auth.json()
    assert "patient_info" in rec_json
    print(f"[PASS] Full Medical Record accessible with 200 OK for patient {rec_json['patient_info']['name']}!")

    res_mh_auth = requests.get(f"{BASE_URL}/doctor/patients/{target_pid}/medical-history", headers=headers)
    assert res_mh_auth.status_code == 200
    print("[PASS] Doctor medical-history endpoint accessible with 200 OK.")

    res_rep_auth = requests.get(f"{BASE_URL}/doctor/patients/{target_pid}/reports", headers=headers)
    assert res_rep_auth.status_code == 200
    print("[PASS] Doctor reports endpoint accessible with 200 OK.")

    res_rx_auth = requests.get(f"{BASE_URL}/doctor/patients/{target_pid}/prescriptions", headers=headers)
    assert res_rx_auth.status_code == 200
    print("[PASS] Doctor prescriptions endpoint accessible with 200 OK.")

    print("\n======================================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! AVAILABLE PATIENTS & OTP ACCESS VERIFIED!")
    print("======================================================================")

if __name__ == "__main__":
    run_tests()
