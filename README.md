# MediKiosk – AI-Powered Digital Clinical History & Prescription Management Platform

**MediKiosk** is a full-stack digital hospital kiosk and clinical OPD platform designed for Indian healthcare facilities. It features **secure passwordless OTP authentication**, **strict Role-Based Access Control (RBAC)**, multi-lingual voice/touch AI conversational intake, document OCR digitization, and an immutable prescription lifecycle management engine.

---

## 🔐 Authentication & RBAC Architecture

### 1. Passwordless OTP-Based Authentication
* **No Passwords**: Completely passwordless architecture for both Patients and Physicians. Passwords are never accepted, stored, or requested.
* **Cryptographic 6-Digit OTP**: Generated using CSPRNG with 5-minute expiration.
* **Rate Limiting & Abuse Prevention**: 60-second cooldown timer between OTP requests, maximum 5 attempts, and automatic single-use invalidation upon verification to prevent replay attacks.
* **JWT Token Bearer**: Signed with HS256 containing `user_id`, `role`, `patient_id`, and `doctor_id`.

### 2. Strict Role-Based Access Control (PATIENT vs DOCTOR)
* **`PATIENT` Role**:
  * Can view their own profile, current active prescription, past prescription history, and past clinical intake sessions.
  * **Strictly READ-ONLY permissions**: Cannot edit prescriptions, cannot alter medical history, cannot access other patients' records, and cannot access doctor routes (`/patients/search` returns `403 Forbidden`).
* **`DOCTOR` Role**:
  * Accesses the Doctor OPD Dashboard.
  * Searches patients across the hospital by Name, Mobile Number, or Patient ID.
  * Views full 4-section medical records.
  * Creates new prescriptions.
  * **Critical Ownership Editing Rule**: Can edit the current active prescription **only if that prescription was created by the logged-in doctor**. If another doctor or a patient attempts to edit, the backend rejects the request with `403 Forbidden`.

---

## 🩺 4-Section Patient Medical Record

When a physician opens a patient's record, clinical information is organized into 4 clearly separated sections:

| Section | Scope & Contents | Access Rules |
| :--- | :--- | :--- |
| **Section A: Patient Information** | Patient ID, Full Name, Age, Gender, DOB, Blood Group, Mobile, Email, Address, Emergency Contact, ABHA ID. | Read-Only for Doctor |
| **Section B: Past Medical History** | Diagnoses, Conditions, Previous treatments, Allergies, Previous prescriptions, Doctor visits, Clinical notes. | **Strictly READ-ONLY**. Historical records are immutable; no edit/delete buttons exist. |
| **Section C: Current Prescription** | Active prescription ID, Doctor Name, Diagnosis, Medicines (Dosage, Frequency, Duration, Instructions), Doctor Notes. | **Editable ONLY by the prescribing doctor** (`can_edit: true`). Locked for other doctors. |
| **Section D: Prescription History** | Archive of past completed treatments, previous medicines, prescribing doctors, and dates. | **Strictly READ-ONLY**. Immutable audit history. |

---

## 💊 Prescription Lifecycle & Ownership Rules

```text
Doctor A creates Prescription
             ↓
     Current Prescription (ACTIVE)
             ↓
  Doctor A can Edit / Finalize
  [Doctor B & Patient: Read-Only / 403 Forbidden]
             ↓
Doctor creates new RX OR clicks Finalize Treatment
             ↓
  Previous Prescription archived to COMPLETED
             ↓
     Prescription History (🔒 READ-ONLY)
```

1. **Active Prescription**: A patient has at most one active prescription at any time.
2. **Creator Doctor Authorization**:
   ```python
   # Backend authorization check:
   if prescription.doctor_id != current_user.doctor_id:
       raise HTTPException(status_code=403, detail="Forbidden: Only the prescribing doctor is authorized to edit this prescription.")
   ```
3. **Automatic Archiving**: When a physician creates a new prescription (`POST /api/v1/prescriptions/patient/{id}`), previous active prescriptions for that patient are automatically updated to `COMPLETED` and become immutable historical records.

---

## 🚀 Fast Testing & Demo Credentials

Use the **1-Click Test** buttons on the Login page or authenticate manually using the mobile numbers below. In development mode, the OTP is returned in the API response and displayed on-screen (`123456` or the 6-digit dev code).

### 👨‍⚕️ Doctor Accounts
| Physician | Department | Registered Mobile | Current Assigned Patient |
| :--- | :--- | :--- | :--- |
| **Dr. Rajesh Sharma** | General Medicine | `9876500001` | Owns Ramesh Kumar's Active RX (`RX-2026-001`) |
| **Dr. Ananya Sundaram** | AYUSH OPD | `9876500002` | Owns Sunita Devi's Active RX (`RX-2026-002`) |

*👉 Verification Scenario*: Log in as **Dr. Rajesh Sharma** (`9876500001`) and open Ramesh Kumar's record → **"Edit Prescription"** button is visible and active. Log in as **Dr. Ananya Sundaram** (`9876500002`) and open Ramesh Kumar's record → Marked **"🔒 Created by Dr. Rajesh Sharma — Read-Only for other doctors"** and all edits are locked!

### 🧑‍🦱 Patient Accounts
| Patient | Demographics | Mobile Number | Mode |
| :--- | :--- | :--- | :--- |
| **Ramesh Kumar** | 58 M, O+ | `9876543210` | English Allopathy Intake |
| **Sunita Devi** | 46 F, B+ | `9876543220` | AYUSH Dashavidha Pariksha |
| **Muthu Kumar** | 62 M, A+ | `9876543230` | Tamil (தமிழ்) Regional Intake |

---

## 💻 Setup & Execution Guide

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & npm

---

### Step 1: Start Python Backend
1. Navigate to `backend`:
   ```powershell
   cd backend
   ```
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Initialize SQLite database and seed demo data:
   ```powershell
   python seed_db.py
   ```
4. Start the server:
   ```powershell
   python -m uvicorn app.main:app --reload --port 8000
   ```
   * Interactive Swagger Documentation: `http://localhost:8000/docs`

---

### Step 2: Start React Frontend
1. Open a new terminal and navigate to `frontend`:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Launch development server:
   ```powershell
   npm run dev
   ```
   * MediKiosk App: `http://localhost:5173`

---

### Step 3: Run Automated RBAC Test Suite
Run the end-to-end integration test verifying registration, OTP rate-limiting, and prescription ownership permissions:
```powershell
cd backend
python test_e2e_rbac.py
```

Expected output:
```text
--- 1. Testing Patient OTP Registration ---
Rate-limiting cooldown correctly enforced: 429 Too Many Requests
Invalid OTP correctly rejected: 400 Bad Request
Patient registered successfully with JWT role PATIENT
OTP reuse prevented!

--- 2. Testing Patient Login with OTP ---
Patient can view own record; prescription is marked can_edit=False.
Security Check Passed: Patient PUT /prescriptions returns 403 Forbidden.
Security Check Passed: Patient GET /patients/search returns 403 Forbidden.

--- 3. Testing Doctor OTP Authentication ---
Doctor A (Dr. Rajesh Sharma) authenticated with DOCTOR role.
Doctor B (Dr. Ananya Sundaram) authenticated with DOCTOR role.

--- 4. Testing Doctor Patient Search & Record Retrieval ---
4-Section Medical Record retrieved successfully.

--- 5. Testing Prescription Ownership & Editing Rules ---
Doctor A can_edit check: True (Owner = Dr. Rajesh Sharma)
Doctor A successfully updated prescription: 200 OK.
Doctor B can_edit check: False (Non-owner = Dr. Ananya Sundaram)
Doctor B edit attempt strictly rejected by backend: 403 Forbidden!

--- 6. Testing Prescription Lifecycle & Historical Immutability ---
New prescription created: ACTIVE.
Previous prescription moved to immutable Prescription History.
Historical prescription edit attempt rejected: 400 Bad Request.

ALL RBAC AND OTP LIFECYCLE TESTS PASSED!
```
