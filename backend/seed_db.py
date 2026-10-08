import os
import datetime
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.models import (
    Doctor,
    Patient,
    User,
    Prescription,
    PrescriptionItem,
    KioskSession,
    ClinicalHistoryEntry,
    UploadedDocument,
    ClinicalSummary,
    EmergencyAlert,
    PatientMedicalReport,
    DoctorViewedPatient,
    DoctorPatient,
    DoctorPatientAccess
)
from app.services.ai_service import generate_structured_summary
from app.services.fhir_service import build_fhir_bundle

def upgrade_sqlite_schema():
    """Safely adds missing columns to SQLite database without wiping existing data."""
    with engine.connect() as conn:
        # Check doctors table columns
        for col, col_type in [
            ("phone", "VARCHAR"),
            ("email", "VARCHAR"),
            ("qualification", "VARCHAR"),
            ("experience_years", "INTEGER"),
            ("hospital_name", "VARCHAR")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE doctors ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Check patients table columns
        for col, col_type in [
            ("dob", "VARCHAR"),
            ("email", "VARCHAR"),
            ("blood_group", "VARCHAR"),
            ("address", "TEXT"),
            ("status", "VARCHAR DEFAULT 'ACTIVE'"),
            ("mobile_verified", "BOOLEAN DEFAULT 1")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE patients ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Check prescription_items table columns for structured timing
        for col, col_type in [
            ("strength", "VARCHAR"),
            ("dosage_amount", "FLOAT"),
            ("dosage_unit", "VARCHAR"),
            ("morning_dose", "INTEGER"),
            ("afternoon_dose", "INTEGER"),
            ("night_dose", "INTEGER"),
            ("timing_code", "VARCHAR")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE prescription_items ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

def seed_database():
    upgrade_sqlite_schema()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed or Update Doctors
        doc1 = db.query(Doctor).filter(Doctor.registration_no == "TN-2026-881").first()
        if not doc1:
            doc1 = Doctor(
                name="Dr. Rajesh Sharma",
                specialty="General Physician & Internal Medicine",
                department="OPD Medicine",
                registration_no="TN-2026-881",
                phone="9876500001",
                email="dr.rajesh@medikiosk.in",
                pin="1234",
                qualification="MBBS, MD (General Medicine)",
                experience_years=12,
                hospital_name="MediKiosk Multi-Speciality OPD"
            )
            db.add(doc1)
            db.commit()
            db.refresh(doc1)
        else:
            doc1.phone = "9876500001"
            doc1.email = "dr.rajesh@medikiosk.in"
            doc1.qualification = "MBBS, MD (General Medicine)"
            doc1.experience_years = 12
            doc1.hospital_name = "MediKiosk Multi-Speciality OPD"
            db.commit()

        doc2 = db.query(Doctor).filter(Doctor.registration_no == "AY-2025-402").first()
        if not doc2:
            doc2 = Doctor(
                name="Dr. Ananya Sundaram",
                specialty="Ayurvedic Physician (BAMS, MD)",
                department="AYUSH OPD",
                registration_no="AY-2025-402",
                phone="9876500002",
                email="dr.ananya@medikiosk.in",
                pin="5678",
                qualification="BAMS, MD (Ayurveda - Kayachikitsa)",
                experience_years=8,
                hospital_name="MediKiosk AYUSH Integrated Centre"
            )
            db.add(doc2)
            db.commit()
            db.refresh(doc2)
        else:
            doc2.phone = "9876500002"
            doc2.email = "dr.ananya@medikiosk.in"
            doc2.qualification = "BAMS, MD (Ayurveda - Kayachikitsa)"
            doc2.experience_years = 8
            doc2.hospital_name = "MediKiosk AYUSH Integrated Centre"
            db.commit()

        # Seed Doctor User accounts
        for doc in [doc1, doc2]:
            u = db.query(User).filter(User.phone == doc.phone).first()
            if not u:
                u = User(
                    phone=doc.phone,
                    email=doc.email,
                    role="DOCTOR",
                    doctor_id=doc.id,
                    is_active=True
                )
                db.add(u)
            else:
                u.role = "DOCTOR"
                u.doctor_id = doc.id
            db.commit()

        # Seed Administrator User account
        admin_u = db.query(User).filter(User.phone == "9876500000").first()
        if not admin_u:
            admin_u = User(
                phone="9876500000",
                email="admin@medikiosk.in",
                role="ADMIN",
                is_active=True
            )
            db.add(admin_u)
        else:
            admin_u.role = "ADMIN"
            admin_u.is_active = True
        db.commit()

        # 2. Seed or Update Patient 1 (Ramesh Kumar)
        p1 = db.query(Patient).filter(Patient.phone == "9876543210").first()
        if not p1:
            p1 = Patient(
                name="Ramesh Kumar",
                dob="1968-05-14",
                age=58,
                gender="Male",
                phone="9876543210",
                email="ramesh.kumar@example.com",
                blood_group="B+",
                address="42, Anna Salai, Chennai, Tamil Nadu - 600002",
                emergency_contact="9876543211",
                preferred_language="en",
                abha_id="91-4582-9901-1234"
            )
            db.add(p1)
            db.commit()
            db.refresh(p1)
        else:
            p1.dob = p1.dob or "1968-05-14"
            p1.blood_group = p1.blood_group or "B+"
            p1.address = p1.address or "42, Anna Salai, Chennai, Tamil Nadu - 600002"
            p1.email = p1.email or "ramesh.kumar@example.com"
            db.commit()

        # 3. Seed or Update Patient 2 (Sunita Devi)
        p2 = db.query(Patient).filter(Patient.phone == "9876543220").first()
        if not p2:
            p2 = Patient(
                name="Sunita Devi",
                dob="1980-08-22",
                age=46,
                gender="Female",
                phone="9876543220",
                email="sunita.devi@example.com",
                blood_group="O+",
                address="18, Civil Lines, Varanasi, Uttar Pradesh - 221002",
                emergency_contact="9876543221",
                preferred_language="hi",
                abha_id="91-1122-3344-5566"
            )
            db.add(p2)
            db.commit()
            db.refresh(p2)
        else:
            p2.dob = p2.dob or "1980-08-22"
            p2.blood_group = p2.blood_group or "O+"
            p2.address = p2.address or "18, Civil Lines, Varanasi, Uttar Pradesh - 221002"
            p2.email = p2.email or "sunita.devi@example.com"
            db.commit()

        # 4. Seed or Update Patient 3 (Muthu Kumar)
        p3 = db.query(Patient).filter(Patient.phone == "9876543230").first()
        if not p3:
            p3 = Patient(
                name="Muthu Kumar",
                dob="1964-01-10",
                age=62,
                gender="Male",
                phone="9876543230",
                email="muthu.kumar@example.com",
                blood_group="A+",
                address="7, Temple Street, Madurai, Tamil Nadu - 625001",
                emergency_contact="9876543231",
                preferred_language="ta"
            )
            db.add(p3)
            db.commit()
            db.refresh(p3)
        else:
            p3.dob = p3.dob or "1964-01-10"
            p3.blood_group = p3.blood_group or "A+"
            p3.address = p3.address or "7, Temple Street, Madurai, Tamil Nadu - 625001"
            p3.email = p3.email or "muthu.kumar@example.com"
            db.commit()

        # Seed Patient User accounts
        for pat in [p1, p2, p3]:
            u = db.query(User).filter(User.phone == pat.phone).first()
            if not u:
                u = User(
                    phone=pat.phone,
                    email=pat.email,
                    role="PATIENT",
                    patient_id=pat.id,
                    is_active=True
                )
                db.add(u)
            else:
                u.role = "PATIENT"
                u.patient_id = pat.id
            db.commit()

        # 5. Seed Prescriptions for Patient 1 (Ramesh Kumar)
        # Active Prescription created by Dr. Rajesh Sharma (Doc 1)
        rx1_active = db.query(Prescription).filter(Prescription.prescription_number == "RX-2026-001").first()
        if not rx1_active:
            rx1_active = Prescription(
                prescription_number="RX-2026-001",
                patient_id=p1.id,
                doctor_id=doc1.id,
                diagnosis="Type 2 Diabetes Mellitus with Essential Hypertension",
                doctor_notes="Maintain low-glycemic, low-sodium diet. Review blood pressure and FBS after 4 weeks.",
                status="ACTIVE",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
            )
            db.add(rx1_active)
            db.commit()
            db.refresh(rx1_active)

            items_rx1 = [
                PrescriptionItem(
                    prescription_id=rx1_active.id,
                    medicine_name="Metformin 500mg",
                    strength="500mg",
                    dosage="1 tablet",
                    dosage_amount=1.0,
                    dosage_unit="Tablet",
                    morning_dose=1,
                    afternoon_dose=0,
                    night_dose=1,
                    timing_code="1-0-1",
                    frequency="Twice daily",
                    duration="30 days",
                    instructions="After breakfast and dinner"
                ),
                PrescriptionItem(
                    prescription_id=rx1_active.id,
                    medicine_name="Telmisartan 40mg",
                    strength="40mg",
                    dosage="1 tablet",
                    dosage_amount=1.0,
                    dosage_unit="Tablet",
                    morning_dose=1,
                    afternoon_dose=0,
                    night_dose=0,
                    timing_code="1-0-0",
                    frequency="Once daily",
                    duration="30 days",
                    instructions="Morning after breakfast"
                )
            ]
            db.add_all(items_rx1)
            db.commit()

        # Historical / Past Prescription for Ramesh Kumar (Completed / Read-Only)
        rx1_past = db.query(Prescription).filter(Prescription.prescription_number == "RX-2025-089").first()
        if not rx1_past:
            rx1_past = Prescription(
                prescription_number="RX-2025-089",
                patient_id=p1.id,
                doctor_id=doc1.id,
                diagnosis="Acute Bronchitis & Upper Respiratory Infection",
                doctor_notes="Course completed. Patient reported symptom relief.",
                status="COMPLETED",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=90)
            )
            db.add(rx1_past)
            db.commit()
            db.refresh(rx1_past)

            items_rx1_past = [
                PrescriptionItem(
                    prescription_id=rx1_past.id,
                    medicine_name="Amoxicillin 500mg",
                    strength="500mg",
                    dosage="1 capsule",
                    dosage_amount=1.0,
                    dosage_unit="Capsule",
                    morning_dose=1,
                    afternoon_dose=1,
                    night_dose=1,
                    timing_code="1-1-1",
                    frequency="Three times daily",
                    duration="5 days",
                    instructions="After food"
                ),
                PrescriptionItem(
                    prescription_id=rx1_past.id,
                    medicine_name="Levocetirizine 5mg",
                    strength="5mg",
                    dosage="1 tablet",
                    dosage_amount=1.0,
                    dosage_unit="Tablet",
                    morning_dose=0,
                    afternoon_dose=0,
                    night_dose=1,
                    timing_code="0-0-1",
                    frequency="Once daily",
                    duration="5 days",
                    instructions="Night before sleep"
                )
            ]
            db.add_all(items_rx1_past)
            db.commit()

        # 6. Seed Prescriptions for Patient 2 (Sunita Devi)
        # Active Prescription created by Dr. Ananya Sundaram (Doc 2)
        rx2_active = db.query(Prescription).filter(Prescription.prescription_number == "RX-2026-002").first()
        if not rx2_active:
            rx2_active = Prescription(
                prescription_number="RX-2026-002",
                patient_id=p2.id,
                doctor_id=doc2.id,
                diagnosis="Sandhivata (Osteoarthritis of Knees) with Agnimandya",
                doctor_notes="Apply warm sesame oil locally. Avoid heavy fermented foods and curd.",
                status="ACTIVE",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=5)
            )
            db.add(rx2_active)
            db.commit()
            db.refresh(rx2_active)

            items_rx2 = [
                PrescriptionItem(
                    prescription_id=rx2_active.id,
                    medicine_name="Yograj Guggulu",
                    strength="Standard",
                    dosage="2 tablets",
                    dosage_amount=2.0,
                    dosage_unit="Tablet",
                    morning_dose=1,
                    afternoon_dose=0,
                    night_dose=1,
                    timing_code="1-0-1",
                    frequency="Twice daily",
                    duration="15 days",
                    instructions="With lukewarm water after meals"
                ),
                PrescriptionItem(
                    prescription_id=rx2_active.id,
                    medicine_name="Ashwagandha Churna",
                    strength="3 grams",
                    dosage="3 grams",
                    dosage_amount=1.0,
                    dosage_unit="Spoon",
                    morning_dose=0,
                    afternoon_dose=0,
                    night_dose=1,
                    timing_code="0-0-1",
                    frequency="Once daily",
                    duration="30 days",
                    instructions="At bedtime with warm milk"
                )
            ]
            db.add_all(items_rx2)
            db.commit()

        # Historical / Past Prescription for Sunita Devi
        rx2_past = db.query(Prescription).filter(Prescription.prescription_number == "RX-2025-042").first()
        if not rx2_past:
            rx2_past = Prescription(
                prescription_number="RX-2025-042",
                patient_id=p2.id,
                doctor_id=doc2.id,
                diagnosis="Amlapitta (Hyperacidity & Dyspepsia)",
                doctor_notes="Digestion restored. Pitta pacifying diet advised.",
                status="COMPLETED",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=120)
            )
            db.add(rx2_past)
            db.commit()
            db.refresh(rx2_past)

            items_rx2_past = [
                PrescriptionItem(
                    prescription_id=rx2_past.id,
                    medicine_name="Avipattikar Churna",
                    strength="3 grams",
                    dosage="3 grams",
                    dosage_amount=1.0,
                    dosage_unit="Spoon",
                    morning_dose=1,
                    afternoon_dose=0,
                    night_dose=1,
                    timing_code="1-0-1",
                    frequency="Twice daily",
                    duration="7 days",
                    instructions="Before food with warm water"
                )
            ]
            db.add_all(items_rx2_past)
            db.commit()

        # 4. Seed sample reports for Ramesh Kumar (Patient #1)
        rep1 = db.query(PatientMedicalReport).filter(PatientMedicalReport.patient_id == p1.id).first()
        if not rep1:
            upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "uploads", "reports", str(p1.id))
            os.makedirs(upload_dir, exist_ok=True)
            sample_file_path = os.path.join(upload_dir, "sample_blood_glucose_report.pdf")
            if not os.path.exists(sample_file_path):
                with open(sample_file_path, "wb") as f:
                    f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n")
            rep1 = PatientMedicalReport(
                patient_id=p1.id,
                report_name="Comprehensive Metabolic Panel & HbA1c",
                report_type="LAB_REPORT",
                report_date=(datetime.date.today() - datetime.timedelta(days=14)).isoformat(),
                description="Routine quarterly fasting blood glucose and HbA1c test results from Metropolis Healthcare Labs.",
                file_name="sample_blood_glucose_report.pdf",
                file_path=sample_file_path,
                file_size_bytes=os.path.getsize(sample_file_path),
                mime_type="application/pdf"
            )
            db.add(rep1)
            db.commit()

        # 5. Seed sample Doctor Viewed Patients
        vp1 = db.query(DoctorViewedPatient).filter(
            DoctorViewedPatient.doctor_id == doc1.id,
            DoctorViewedPatient.patient_id == p1.id
        ).first()
        if not vp1:
            vp1 = DoctorViewedPatient(
                doctor_id=doc1.id,
                patient_id=p1.id,
                first_viewed_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                last_viewed_at=datetime.datetime.utcnow()
            )
            db.add(vp1)
            db.commit()

        vp2 = db.query(DoctorViewedPatient).filter(
            DoctorViewedPatient.doctor_id == doc2.id,
            DoctorViewedPatient.patient_id == p2.id
        ).first()
        if not vp2:
            vp2 = DoctorViewedPatient(
                doctor_id=doc2.id,
                patient_id=p2.id,
                first_viewed_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                last_viewed_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
            )
            db.add(vp2)
            db.commit()

        # 6. Seed sample Doctor-Patient Active Associations
        dp1 = db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == doc1.id,
            DoctorPatient.patient_id == p1.id
        ).first()
        if not dp1:
            dp1 = DoctorPatient(
                doctor_id=doc1.id,
                patient_id=p1.id,
                added_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                verified_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                last_viewed_at=datetime.datetime.utcnow(),
                status="ACTIVE"
            )
            db.add(dp1)
            db.commit()

        dp2 = db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == doc2.id,
            DoctorPatient.patient_id == p2.id
        ).first()
        if not dp2:
            dp2 = DoctorPatient(
                doctor_id=doc2.id,
                patient_id=p2.id,
                added_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                verified_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                last_viewed_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
                status="ACTIVE"
            )
            db.add(dp2)
            db.commit()

        # 7. Seed Additional Registered Patients for "Available Patients" Discovery
        p3 = db.query(Patient).filter(Patient.phone == "9876543230").first()
        if not p3:
            p3 = Patient(
                name="Suthanthiran S",
                dob="1996-03-12",
                age=30,
                gender="Male",
                phone="9876543230",
                email="suthanthiran.s@example.com",
                blood_group="O+",
                address="Avinashi Road, Coimbatore, Tamil Nadu",
                emergency_contact="9876543231",
                preferred_language="en"
            )
            db.add(p3)
            db.commit()
            db.refresh(p3)

        p4 = db.query(Patient).filter(Patient.phone == "9876543240").first()
        if not p4:
            p4 = Patient(
                name="Arun Kumar",
                dob="1984-07-24",
                age=42,
                gender="Male",
                phone="9876543240",
                email="arun.kumar@example.com",
                blood_group="B+",
                address="Gandhipuram, Coimbatore, Tamil Nadu",
                emergency_contact="9876543241",
                preferred_language="en"
            )
            db.add(p4)
            db.commit()
            db.refresh(p4)

        p5 = db.query(Patient).filter(Patient.phone == "9876543250").first()
        if not p5:
            p5 = Patient(
                name="Priya Devi",
                dob="1998-11-05",
                age=28,
                gender="Female",
                phone="9876543250",
                email="priya.devi@example.com",
                blood_group="A+",
                address="RS Puram, Coimbatore, Tamil Nadu",
                emergency_contact="9876543251",
                preferred_language="ta"
            )
            db.add(p5)
            db.commit()
            db.refresh(p5)

        # 7b. Ensure all patients have status ACTIVE, mobile_verified True, and User account
        all_patients = db.query(Patient).all()
        for pat in all_patients:
            if not pat.status:
                pat.status = "ACTIVE"
            if pat.mobile_verified is None:
                pat.mobile_verified = True
            
            pat_user = db.query(User).filter(User.phone == pat.phone).first()
            if not pat_user:
                pat_user = User(
                    phone=pat.phone,
                    email=pat.email,
                    role="PATIENT",
                    patient_id=pat.id,
                    is_active=True
                )
                db.add(pat_user)
            else:
                pat_user.role = "PATIENT"
                pat_user.patient_id = pat.id
                pat_user.is_active = True
        db.commit()

        # 8. Seed DoctorPatientAccess Records
        dpa1 = db.query(DoctorPatientAccess).filter(
            DoctorPatientAccess.doctor_id == doc1.id,
            DoctorPatientAccess.patient_id == p1.id
        ).first()
        if not dpa1:
            dpa1 = DoctorPatientAccess(
                doctor_id=doc1.id,
                patient_id=p1.id,
                status="AUTHORIZED",
                requested_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                otp_verified_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                authorized_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                last_accessed_at=datetime.datetime.utcnow()
            )
            db.add(dpa1)
            db.commit()

        dpa2 = db.query(DoctorPatientAccess).filter(
            DoctorPatientAccess.doctor_id == doc2.id,
            DoctorPatientAccess.patient_id == p2.id
        ).first()
        if not dpa2:
            dpa2 = DoctorPatientAccess(
                doctor_id=doc2.id,
                patient_id=p2.id,
                status="AUTHORIZED",
                requested_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                otp_verified_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                authorized_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
                last_accessed_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
            )
            db.add(dpa2)
            db.commit()

        print("Database schema upgraded and seeded with doctors, patients, user RBAC, prescriptions, reports, viewed patients, and doctor_patient_access records!")

    except Exception as e:
        db.rollback()
        print(f"Error during database upgrade and seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
