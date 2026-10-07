from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Authentication & OTP Schemas ---
class SendOTPRequest(BaseModel):
    phone: str
    purpose: str = "LOGIN" # "LOGIN", "REGISTER"
    role: str = "PATIENT" # "PATIENT", "DOCTOR"

class SendOTPResponse(BaseModel):
    message: str
    phone: str
    cooldown_seconds: int = 60
    dev_mock_otp: Optional[str] = None

class PatientRegisterVerifyRequest(BaseModel):
    full_name: Optional[str] = None
    name: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def populate_name(cls, data: Any):
        if isinstance(data, dict):
            if not data.get('full_name') and data.get('name'):
                data['full_name'] = data.get('name')
            elif not data.get('name') and data.get('full_name'):
                data['name'] = data.get('full_name')
        return data
    dob: Optional[str] = None # YYYY-MM-DD
    gender: str # "Male", "Female", "Other"
    phone: str
    email: Optional[str] = None
    blood_group: Optional[str] = None # "O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: str = "en"
    abha_id: Optional[str] = None
    otp: str

class VerifyOTPLoginRequest(BaseModel):
    phone: str
    otp: str
    role: Optional[str] = None # Optional hint, but verified from backend

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str # "PATIENT", "DOCTOR"
    user_id: int
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    name: str
    phone: str
    user_data: Optional[Dict[str, Any]] = None

# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    name: str
    specialty: str = "General Physician"
    department: str = "OPD - General Medicine"
    registration_no: str
    phone: Optional[str] = None
    email: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    hospital_name: Optional[str] = None

class DoctorCreate(DoctorBase):
    pin: Optional[str] = "1234"

class DoctorBriefResponse(BaseModel):
    id: int
    name: str
    specialty: str
    department: str
    registration_no: str
    phone: Optional[str] = None
    class Config:
        from_attributes = True

class DoctorResponse(DoctorBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class DoctorRegisterVerifyRequest(BaseModel):
    name: str # Doctor Full Name *
    phone: str # Mobile Number *
    email: Optional[str] = None
    registration_no: str # Medical Registration Number *
    specialty: str # Specialization *
    qualification: str # Qualification *
    experience_years: Optional[int] = 0
    hospital_name: Optional[str] = None
    department: Optional[str] = None
    otp: str

class DoctorStatsResponse(BaseModel):
    viewed_patients_count: int
    today_patients_count: int
    active_cases_count: int
    doctor: Optional[DoctorResponse] = None

class ViewedPatientItem(BaseModel):
    patient_id: int
    formatted_patient_id: str
    name: str
    phone: str
    age: int
    gender: str
    blood_group: Optional[str] = None
    last_viewed_at: datetime
    last_viewed_display: str
    active_diagnosis: Optional[str] = None

class DoctorCheckPatientPhoneRequest(BaseModel):
    phone: str

class DoctorCheckPatientPhoneResponse(BaseModel):
    exists: bool
    patient: Optional[Dict[str, Any]] = None

# --- Doctor-Patient Association & Verification Schemas ---
class DoctorPatientCheckRequest(BaseModel):
    phone: str

class DoctorPatientCheckPatientInfo(BaseModel):
    id: int
    formatted_id: str
    name: str
    phone: str
    masked_phone: str

class DoctorPatientCheckResponse(BaseModel):
    status: str # "NOT_FOUND", "ALREADY_ADDED", "FOUND"
    exists: bool
    already_added: bool = False
    message: str
    patient: Optional[DoctorPatientCheckPatientInfo] = None

class DoctorPatientSendOTPRequest(BaseModel):
    phone: str

class DoctorPatientSendOTPResponse(BaseModel):
    status: str = "SUCCESS"
    message: str
    phone: str
    masked_phone: str
    cooldown_seconds: int = 60
    dev_mock_otp: Optional[str] = None

class DoctorPatientVerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class DoctorPatientVerifyOTPResponse(BaseModel):
    status: str = "SUCCESS"
    message: str
    patient: Dict[str, Any]

class AvailablePatientItem(BaseModel):
    id: str # "PT-001"
    patient_id: int # 1
    formatted_patient_id: str # "PT-001"
    name: str
    mobile: str # "********2345"
    masked_phone: str # "+91 XXXXX 12345"
    gender: str = "Unknown"
    age: int = 0
    status: str # "AVAILABLE", "ACCESS_PENDING", "AUTHORIZED", "REVOKED"
    requested_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AvailablePatientsResponse(BaseModel):
    patients: List[AvailablePatientItem]
    total: int

class RequestAccessResponse(BaseModel):
    status: str # "ACCESS_PENDING", "AUTHORIZED"
    message: str
    patient_id: int
    formatted_patient_id: str
    patient_name: str
    masked_phone: str
    cooldown_seconds: int = 60
    dev_mock_otp: Optional[str] = None

class VerifyAccessRequest(BaseModel):
    otp: str

class VerifyAccessResponse(BaseModel):
    status: str = "AUTHORIZED"
    message: str
    patient: Dict[str, Any]

class DoctorCreatePatientRequest(BaseModel):
    name: str
    phone: str
    dob: Optional[str] = None
    gender: str = "Male"
    blood_group: Optional[str] = "O+"
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    otp: str

class DoctorLoginRequest(BaseModel):
    registration_no: str
    pin: str

# --- Patient Schemas ---
class PatientBase(BaseModel):
    name: str
    dob: Optional[str] = None
    age: int = 45
    gender: str
    phone: str
    email: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: str = "en"
    abha_id: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PatientLoginRequest(BaseModel):
    phone: Optional[str] = None
    abha_id: Optional[str] = None

class PatientSearchItem(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    phone: str
    abha_id: Optional[str] = None
    blood_group: Optional[str] = None
    active_diagnosis: Optional[str] = None

# --- Prescription & Prescription Items Schemas ---
class PrescriptionItemBase(BaseModel):
    medicine_name: str
    strength: Optional[str] = None
    dosage: Optional[str] = "1 tablet"
    dosage_amount: Optional[float] = 1.0
    dosage_unit: Optional[str] = "Tablet"
    morning_dose: Optional[int] = 0
    afternoon_dose: Optional[int] = 0
    night_dose: Optional[int] = 0
    timing_code: Optional[str] = "1-0-0"
    frequency: Optional[str] = "Once daily"
    duration: str
    instructions: Optional[str] = None

class PrescriptionItemCreate(BaseModel):
    medicine_name: str
    strength: Optional[str] = None
    dosage: Optional[str] = None
    dosage_amount: Optional[float] = 1.0
    dosage_unit: Optional[str] = "Tablet"
    morning_dose: Optional[int] = 0
    afternoon_dose: Optional[int] = 0
    night_dose: Optional[int] = 0
    timing_code: Optional[str] = None
    frequency: Optional[str] = None
    duration: str
    instructions: Optional[str] = None

class PrescriptionItemResponse(BaseModel):
    id: int
    prescription_id: int
    medicine_name: str
    strength: Optional[str] = None
    dosage: str
    dosage_amount: Optional[float] = 1.0
    dosage_unit: Optional[str] = "Tablet"
    morning_dose: Optional[int] = 0
    afternoon_dose: Optional[int] = 0
    night_dose: Optional[int] = 0
    timing_code: Optional[str] = "1-0-0"
    frequency: str
    duration: str
    instructions: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    diagnosis: str
    doctor_notes: Optional[str] = None
    items: List[PrescriptionItemCreate]

class PrescriptionUpdate(BaseModel):
    diagnosis: Optional[str] = None
    doctor_notes: Optional[str] = None
    items: Optional[List[PrescriptionItemCreate]] = None

class PrescriptionResponse(BaseModel):
    id: int
    prescription_number: str
    patient_id: int
    doctor_id: int
    diagnosis: str
    doctor_notes: Optional[str] = None
    status: str # "ACTIVE", "COMPLETED", "CANCELLED"
    created_at: datetime
    updated_at: datetime
    doctor: Optional[DoctorBriefResponse] = None
    items: List[PrescriptionItemResponse] = []
    can_edit: bool = False # Dynamically calculated on backend based on doctor ownership
    class Config:
        from_attributes = True

class PatientPrescriptionsOverview(BaseModel):
    current_prescription: Optional[PrescriptionResponse] = None
    prescription_history: List[PrescriptionResponse] = []

# --- Patient Medical Record Schemas ---
class PastMedicalHistoryItem(BaseModel):
    session_id: int
    session_token: str
    date: datetime
    method: str # "English Method" or "AYUSH Method"
    chief_complaint: Optional[str] = None
    hpi: Optional[str] = None
    past_medical_surgical: Optional[str] = None
    medication_history: Optional[str] = None
    allergy_history: Optional[str] = None
    ayush_assessment: Optional[str] = None
    doctor_notes: Optional[str] = None
    doctor_verified: bool = False
    documents: List[Dict[str, Any]] = []

class PatientReportResponse(BaseModel):
    id: int
    patient_id: int
    report_name: str
    report_type: str
    report_date: Optional[str] = None
    description: Optional[str] = None
    file_name: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    view_url: Optional[str] = None
    download_url: Optional[str] = None

    class Config:
        from_attributes = True

class PatientMedicalRecordResponse(BaseModel):
    patient_info: PatientResponse
    past_medical_history: List[PastMedicalHistoryItem] = []
    current_prescription: Optional[PrescriptionResponse] = None
    prescription_history: List[PrescriptionResponse] = []
    medical_reports: List[PatientReportResponse] = []

# --- Kiosk Session Schemas ---
class KioskSessionCreate(BaseModel):
    patient_id: int
    language: str = "en"
    ayush_mode: bool = False

class KioskSessionConsentUpdate(BaseModel):
    consent_given: bool

class KioskSessionResponse(BaseModel):
    id: int
    patient_id: int
    session_token: str
    language: str
    consent_given: bool
    ayush_mode: bool
    emergency_flagged: bool
    emergency_details: Optional[str] = None
    status: str
    created_at: datetime
    patient: Optional[PatientResponse] = None
    class Config:
        from_attributes = True

# --- History & AI Chat Schemas ---
class HistoryChatRequest(BaseModel):
    session_id: int
    user_input: str
    section: str = "chief_complaint"
    input_type: str = "text"
    ayush_category: Optional[str] = None

class HistoryEntryResponse(BaseModel):
    id: int
    session_id: int
    section: str
    question: str
    response: str
    input_type: str
    ayush_category: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class HistoryChatResponse(BaseModel):
    next_question: str
    suggested_quick_chips: List[str] = []
    current_section: str
    next_section: str
    section_completed: bool = False
    is_emergency: bool = False
    emergency_warning: Optional[str] = None
    audio_tts_prompt: str = ""

# --- Document Digitization & OCR Schemas ---
class ExtractedEntities(BaseModel):
    diagnoses: List[Dict[str, Any]] = []
    medications: List[Dict[str, Any]] = []
    lab_values: List[Dict[str, Any]] = []
    dates: List[str] = []

class DocumentUploadResponse(BaseModel):
    id: int
    session_id: int
    file_name: str
    doc_type: str
    raw_ocr_text: str
    ocr_confidence: float
    extracted_entities: ExtractedEntities
    patient_verified: bool
    created_at: datetime
    class Config:
        from_attributes = True

class DocumentVerifyRequest(BaseModel):
    extracted_entities: ExtractedEntities
    patient_verified: bool = True

# --- Clinical Summary Schemas ---
class ClinicalSummaryResponse(BaseModel):
    id: int
    session_id: int
    chief_complaint: Optional[str] = None
    hpi: Optional[str] = None
    past_medical_surgical: Optional[str] = None
    medication_history: Optional[str] = None
    allergy_history: Optional[str] = None
    family_history: Optional[str] = None
    personal_history: Optional[str] = None
    ayush_assessment: Optional[str] = None
    review_of_systems: Optional[str] = None
    previous_investigations: Optional[str] = None
    missing_or_uncertain_info: Optional[List[str]] = None
    doctor_verified: bool = False
    doctor_notes: Optional[str] = None
    verified_by_doctor_id: Optional[int] = None
    fhir_bundle: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class DoctorVerifySummaryRequest(BaseModel):
    doctor_id: int
    chief_complaint: Optional[str] = None
    hpi: Optional[str] = None
    past_medical_surgical: Optional[str] = None
    medication_history: Optional[str] = None
    allergy_history: Optional[str] = None
    family_history: Optional[str] = None
    personal_history: Optional[str] = None
    ayush_assessment: Optional[str] = None
    review_of_systems: Optional[str] = None
    previous_investigations: Optional[str] = None
    doctor_notes: Optional[str] = None
    doctor_verified: bool = True

# --- Emergency Alert Schemas ---
class EmergencyAlertResponse(BaseModel):
    id: int
    session_id: int
    patient_id: int
    warning_symptom: str
    severity: str
    status: str
    details: Optional[str] = None
    created_at: datetime
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    class Config:
        from_attributes = True
