"""
MediKiosk Database Models (SQLAlchemy ORM)

This module defines the relational schema for MediKiosk stored in SQLite (ready for PostgreSQL migration):
- User: Role-Based Authentication entity (PATIENT, DOCTOR) with phone mapping.
- Doctor: OPD Physicians & Ayurvedic Practitioners with registration numbers & phone.
- Patient: Demographic records, ABHA ID, DOB, Blood Group, Address, Contact.
- OTPVerification: Secure 5-minute OTP verifications for passwordless login and registration.
- Prescription: Patient active & historical prescriptions with doctor ownership rules.
- PrescriptionItem: Normalized medicines, dosages, frequencies, durations, instructions.
- KioskSession: Active patient session token, consent state, AYUSH mode flag, emergency status.
- ClinicalHistoryEntry: Intake questions, answers, voice transcripts, AYUSH categories.
- UploadedDocument: Scanned medical reports (prescriptions, labs, discharge summaries), OCR text.
- ClinicalSummary: Synthesized clinical summary, doctor notes, verification status.
- EmergencyAlert: Red-flag triage alerts triggered at kiosk intake.
- AuditLog: Security and access audit logging.
"""

import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, nullable=False, index=True) # "PATIENT", "DOCTOR"
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", foreign_keys=[patient_id])
    doctor = relationship("Doctor", foreign_keys=[doctor_id])

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialty = Column(String, default="General Physician")
    registration_no = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True) # Used for OTP login
    email = Column(String, nullable=True)
    pin = Column(String, default="1234") # Fallback doctor PIN
    department = Column(String, default="OPD - General Medicine")
    qualification = Column(String, nullable=True) # e.g. MBBS, MD
    experience_years = Column(Integer, nullable=True) # e.g. 10
    hospital_name = Column(String, nullable=True) # e.g. MediKiosk OPD
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    summaries = relationship("ClinicalSummary", back_populates="verified_by_doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    viewed_patients = relationship("DoctorViewedPatient", back_populates="doctor", cascade="all, delete-orphan")
    associated_patients = relationship("DoctorPatient", back_populates="doctor", cascade="all, delete-orphan")
    access_grants = relationship("DoctorPatientAccess", back_populates="doctor", cascade="all, delete-orphan")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    abha_id = Column(String, unique=True, index=True, nullable=True) # ABHA / Ayushman Bharat Health Account ID
    name = Column(String, nullable=False)
    dob = Column(String, nullable=True) # Date of Birth (YYYY-MM-DD)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False) # Male, Female, Other
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    blood_group = Column(String, nullable=True) # O+, A+, B+, AB+, O-, A-, B-, AB-
    address = Column(Text, nullable=True)
    emergency_contact = Column(String, nullable=True)
    preferred_language = Column(String, default="en") # en, hi, ta
    status = Column(String, default="ACTIVE") # "ACTIVE", "INACTIVE", "DELETED"
    mobile_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("KioskSession", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    medical_reports = relationship("PatientMedicalReport", back_populates="patient", cascade="all, delete-orphan")
    doctor_associations = relationship("DoctorPatient", back_populates="patient", cascade="all, delete-orphan")
    doctor_access_grants = relationship("DoctorPatientAccess", back_populates="patient", cascade="all, delete-orphan")

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    purpose = Column(String, default="LOGIN") # "LOGIN", "REGISTER"
    role = Column(String, default="PATIENT") # "PATIENT", "DOCTOR"
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    prescription_number = Column(String, unique=True, index=True, nullable=False) # e.g. RX-2026-001
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    diagnosis = Column(String, nullable=False)
    doctor_notes = Column(Text, nullable=True)
    status = Column(String, default="ACTIVE") # "ACTIVE", "COMPLETED", "CANCELLED"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False, index=True)
    medicine_name = Column(String, nullable=False)
    strength = Column(String, nullable=True) # e.g. "500mg"
    dosage = Column(String, nullable=False) # e.g. "1 tablet"
    dosage_amount = Column(Float, nullable=True, default=1.0) # e.g. 1
    dosage_unit = Column(String, nullable=True, default="Tablet") # e.g. "Tablet", "Capsule", "Spoon", "ml", "Drop", "Puff", "Injection", "Other"
    morning_dose = Column(Integer, nullable=True, default=0) # 0, 1, 2, 3
    afternoon_dose = Column(Integer, nullable=True, default=0) # 0, 1, 2, 3
    night_dose = Column(Integer, nullable=True, default=0) # 0, 1, 2, 3
    timing_code = Column(String, nullable=True, default="1-0-0") # e.g. "1-0-0", "1-1-1"
    frequency = Column(String, nullable=False) # e.g. "Once daily", "Twice daily", "Three times daily"
    duration = Column(String, nullable=False) # e.g. "5 days", "1 month"
    instructions = Column(String, nullable=True) # e.g. "After food"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    prescription = relationship("Prescription", back_populates="items")

class KioskSession(Base):
    __tablename__ = "kiosk_sessions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    session_token = Column(String, unique=True, index=True)
    language = Column(String, default="en") # en, hi, ta
    consent_given = Column(Boolean, default=False)
    consent_timestamp = Column(DateTime, nullable=True)
    ayush_mode = Column(Boolean, default=False) # True if Dashavidha Pariksha mode enabled
    emergency_flagged = Column(Boolean, default=False)
    emergency_details = Column(Text, nullable=True)
    status = Column(String, default="in_progress") # in_progress, awaiting_doctor, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="sessions")
    history_entries = relationship("ClinicalHistoryEntry", back_populates="session", cascade="all, delete-orphan")
    documents = relationship("UploadedDocument", back_populates="session", cascade="all, delete-orphan")
    summary = relationship("ClinicalSummary", back_populates="session", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("EmergencyAlert", back_populates="session", cascade="all, delete-orphan")

class ClinicalHistoryEntry(Base):
    __tablename__ = "clinical_history_entries"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("kiosk_sessions.id"), nullable=False)
    section = Column(String, nullable=False) # chief_complaint, hpi, past_medical, past_surgical, medications, allergies, family_history, personal_history, ayush_dashavidha
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    input_type = Column(String, default="text") # text, voice, quick_chip
    ayush_category = Column(String, nullable=True) # E.g., Prakriti, Agni, KALA, etc.
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("KioskSession", back_populates="history_entries")

class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("kiosk_sessions.id"), nullable=False)
    file_name = Column(String, nullable=False)
    doc_type = Column(String, default="prescription") # prescription, lab_report, discharge_summary, general
    raw_ocr_text = Column(Text, nullable=True)
    ocr_confidence = Column(Float, default=0.85)
    extracted_entities = Column(JSON, nullable=True) # {diagnoses: [], medications: [], lab_values: [], dates: []}
    patient_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("KioskSession", back_populates="documents")

class ClinicalSummary(Base):
    __tablename__ = "clinical_summaries"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("kiosk_sessions.id"), unique=True, nullable=False)
    chief_complaint = Column(Text, nullable=True)
    hpi = Column(Text, nullable=True) # History of Present Illness
    past_medical_surgical = Column(Text, nullable=True)
    medication_history = Column(Text, nullable=True)
    allergy_history = Column(Text, nullable=True)
    family_history = Column(Text, nullable=True)
    personal_history = Column(Text, nullable=True)
    ayush_assessment = Column(Text, nullable=True)
    review_of_systems = Column(Text, nullable=True)
    previous_investigations = Column(Text, nullable=True)
    missing_or_uncertain_info = Column(JSON, nullable=True) # ["Exact duration of fever unknown", "Medication dosage unverified"]
    doctor_verified = Column(Boolean, default=False)
    doctor_notes = Column(Text, nullable=True)
    verified_by_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    fhir_bundle = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    session = relationship("KioskSession", back_populates="summary")
    verified_by_doctor = relationship("Doctor", back_populates="summaries")

class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("kiosk_sessions.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    warning_symptom = Column(String, nullable=False)
    severity = Column(String, default="HIGH") # CRITICAL, HIGH
    status = Column(String, default="ACTIVE") # ACTIVE, ACKNOWLEDGED, RESOLVED
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("KioskSession", back_populates="alerts")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    role = Column(String, default="SYSTEM") # "PATIENT", "DOCTOR", "SYSTEM"
    action = Column(String, nullable=False) # e.g. "PATIENT_LOGIN", "DOCTOR_LOGIN", "PATIENT_RECORD_VIEWED", "PRESCRIPTION_CREATED", "PRESCRIPTION_EDITED", "PRESCRIPTION_FINALIZED"
    resource_type = Column(String, nullable=False) # "patient", "prescription", "auth"
    resource_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
 
class PatientMedicalReport(Base):
    __tablename__ = "patient_medical_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    report_name = Column(String, nullable=False) # e.g. "Complete Blood Count", "Chest X-Ray"
    report_type = Column(String, nullable=False) # Blood Test, X-Ray, CT Scan, MRI, ECG, Ultrasound, Prescription, Lab Report, Other
    report_date = Column(String, nullable=True) # DD/MM/YYYY or YYYY-MM-DD
    description = Column(Text, nullable=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="medical_reports")
 
class DoctorViewedPatient(Base):
    __tablename__ = "doctor_viewed_patients"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    first_viewed_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_viewed_at = Column(DateTime, default=datetime.datetime.utcnow)

    doctor = relationship("Doctor", back_populates="viewed_patients")
    patient = relationship("Patient")

class DoctorPatient(Base):
    __tablename__ = "doctor_patients"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)
    verified_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_viewed_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="ACTIVE") # "ACTIVE", "INACTIVE"

    __table_args__ = (UniqueConstraint('doctor_id', 'patient_id', name='uq_doctor_patient'),)

    doctor = relationship("Doctor", back_populates="associated_patients")
    patient = relationship("Patient", back_populates="doctor_associations")

class DoctorPatientAccess(Base):
    __tablename__ = "doctor_patient_access"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    status = Column(String, default="AVAILABLE") # "AVAILABLE", "ACCESS_PENDING", "AUTHORIZED", "ACCESS_DENIED", "REVOKED"
    requested_at = Column(DateTime, nullable=True)
    otp_verified_at = Column(DateTime, nullable=True)
    authorized_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)

    __table_args__ = (UniqueConstraint('doctor_id', 'patient_id', name='uq_doctor_patient_access'),)

    doctor = relationship("Doctor", back_populates="access_grants")
    patient = relationship("Patient", back_populates="doctor_access_grants")

