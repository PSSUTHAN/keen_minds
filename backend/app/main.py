"""
MediKiosk Backend Main FastAPI Application Server

This module serves as the primary entry point for the MediKiosk FastAPI application.
It configures:
- Database table creation on startup
- Strict CORS middleware with whitelisted origins (NO wildcards)
- Security transport headers (HSTS, nosniff, frame protection, CSP)
- HTTPS redirection in production environments
- Modular API Router inclusion (/api/v1/auth, /api/v1/patients, etc.)
- Database seeding event handler for instant demo data population
- Health check and root diagnostic status endpoints
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, patients, prescriptions, history, documents, summary, doctor, fhir, admin
from seed_db import seed_database

from sqlalchemy import inspect, text

# Initialize SQLAlchemy metadata and create database tables if they do not exist
Base.metadata.create_all(bind=engine)

# Auto-migration check: ensure otp_hash column exists
try:
    with engine.connect() as _conn:
        _cols = [c["name"] for c in inspect(engine).get_columns("otp_verifications")]
        if "otp_hash" not in _cols:
            _conn.execute(text("ALTER TABLE otp_verifications ADD COLUMN otp_hash VARCHAR(128)"))
            _conn.commit()
except Exception:
    pass

# Fail-fast security validation on boot
settings.validate_security()

# Initialize FastAPI application instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.0",
    description="AI-Powered Digital Clinical History Platform for Indian Hospitals"
)

# --- SECURITY TRANSPORT & HEADERS MIDDLEWARE ---

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Enforce HTTPS redirect if configured
        if settings.ENFORCE_HTTPS:
            forwarded_proto = request.headers.get("x-forwarded-proto", "")
            if request.url.scheme == "http" and forwarded_proto != "https":
                https_url = request.url.replace(scheme="https")
                return Response(status_code=307, headers={"Location": str(https_url)})

        response = await call_next(request)

        # HTTP Strict Transport Security (HSTS)
        if settings.ENFORCE_HTTPS or settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Defense-in-depth transport and browser hardening headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' data: https://fastapi.tiangolo.com;"
)
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(self), camera=()"

        return response

app.add_middleware(SecurityHeadersMiddleware)

# --- STRICT CORS MIDDLEWARE (NO WILDCARD ALLOWED) ---
allowed_origins = settings.get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"],
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
    settings.validate_security()
    # Seed database on startup if empty
    seed_database()

@app.get("/")
@app.get("/health")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs_url": "/docs",
        "abdm_mode": "MOCK / CONFIGURABLE",
        "env": settings.APP_ENV
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
