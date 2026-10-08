"""
MediKiosk Database Management & Administration Router

Provides APIs for database health monitoring, table statistics,
re-seeding demo data, resetting tables, and exporting full JSON database backups.
Strictly protected by ADMIN role-based access control.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db, engine, Base
from app.models import (
    User, Doctor, Patient, KioskSession, ClinicalHistoryEntry,
    UploadedDocument, ClinicalSummary, EmergencyAlert
)
from app.services.auth_service import require_role, log_audit
from seed_db import seed_database

router = APIRouter(
    prefix="/admin/db",
    tags=["Database Administration & Backup"],
    dependencies=[Depends(require_role(["ADMIN"]))]
)

@router.get("/stats", response_model=Dict[str, Any])
def get_database_statistics(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Returns current row counts and status for all MediKiosk database tables.
    Strictly restricted to ADMIN role.
    """
    log_audit(
        db,
        current_user.id,
        "ADMIN",
        "ADMIN_DB_STATS",
        "database",
        details="Admin viewed database statistics."
    )

    return {
        "database_type": "SQLite" if "sqlite" in engine.url.drivername else "PostgreSQL",
        "database_url": str(engine.url).split("@")[-1], # Mask credentials
        "table_counts": {
            "doctors": db.query(Doctor).count(),
            "patients": db.query(Patient).count(),
            "kiosk_sessions": db.query(KioskSession).count(),
            "history_entries": db.query(ClinicalHistoryEntry).count(),
            "uploaded_documents": db.query(UploadedDocument).count(),
            "clinical_summaries": db.query(ClinicalSummary).count(),
            "emergency_alerts": db.query(EmergencyAlert).count()
        },
        "status": "HEALTHY"
    }

@router.post("/seed")
def seed_db_endpoint(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Triggers database seeding with demo Indian patient & doctor records.
    Strictly restricted to ADMIN role.
    """
    try:
        seed_database()
        log_audit(
            db,
            current_user.id,
            "ADMIN",
            "ADMIN_DB_SEED",
            "database",
            details="Admin triggered database demo re-seeding."
        )
        return {"status": "SUCCESS", "message": "Database successfully seeded with synthetic Indian hospital records."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database seeding failed: {str(e)}")

@router.post("/reset")
def reset_db_endpoint(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Clears all database tables and recreates empty schema.
    Strictly restricted to ADMIN role.
    """
    try:
        log_audit(
            db,
            current_user.id,
            "ADMIN",
            "ADMIN_DB_RESET",
            "database",
            details="Admin initiated database reset."
        )
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        return {"status": "SUCCESS", "message": "Database tables dropped and recreated cleanly."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database reset failed: {str(e)}")

@router.get("/export")
def export_database_json(
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Exports full database contents as a JSON object for hospital EMR backup & migration.
    Strictly restricted to ADMIN role.
    """
    patients = db.query(Patient).all()
    doctors = db.query(Doctor).all()
    sessions = db.query(KioskSession).all()
    summaries = db.query(ClinicalSummary).all()

    log_audit(
        db,
        current_user.id,
        "ADMIN",
        "ADMIN_DB_EXPORT",
        "database",
        details=f"Admin exported full database JSON backup ({len(patients)} patients, {len(doctors)} doctors)."
    )

    return {
        "export_timestamp": str(engine.url),
        "doctors": [{"id": d.id, "name": d.name, "specialty": d.specialty, "reg_no": d.registration_no} for d in doctors],
        "patients": [{"id": p.id, "name": p.name, "age": p.age, "gender": p.gender, "phone": p.phone, "abha_id": p.abha_id} for p in patients],
        "sessions_count": len(sessions),
        "summaries_count": len(summaries)
    }
