"""
MediKiosk Backend Main FastAPI Application Server

This module serves as the primary entry point for the MediKiosk FastAPI application.
It configures:
- Database table creation on startup
- CORS middleware for React Vite frontend (http://localhost:5173)
- Modular API Router inclusion (/api/v1/auth, /api/v1/patients, etc.)
- Database seeding event handler for instant demo data population
- Health check and root diagnostic status endpoints
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, patients, prescriptions, history, documents, summary, doctor, fhir, admin
from seed_db import seed_database

# Initialize SQLAlchemy metadata and create database tables if they do not exist
Base.metadata.create_all(bind=engine)

# Initialize FastAPI application instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.0",
    description="AI-Powered Digital Clinical History Platform for Indian Hospitals"
)

# CORS Middleware for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows local React development server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(prescriptions.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(summary.router, prefix=settings.API_V1_STR)
app.include_router(doctor.router, prefix=settings.API_V1_STR)
app.include_router(fhir.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    # Seed database on startup if empty
    seed_database()

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs_url": "/docs",
        "abdm_mode": "MOCK / CONFIGURABLE"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
