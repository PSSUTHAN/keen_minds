import os
from typing import List, Optional
from pydantic_settings import BaseSettings

# Base backend directory for resolving local assets and database
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB_PATH = os.path.join(BACKEND_DIR, "medikiosk.db").replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "MediKiosk - AI Clinical History Platform"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = os.getenv("APP_ENV", "development") # "development" | "production" | "test"
    ENFORCE_HTTPS: bool = os.getenv("ENFORCE_HTTPS", "false").lower() in ("true", "1", "yes")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    
    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # CORS Configuration (Restricted explicit origins, comma-separated)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    )
    
    # Demo OTP Display (Development / Hackathon Mode Only)
    SHOW_DEMO_OTP: Optional[bool] = None
    
    # OTP Configuration & Gateway
    OTP_MODE: str = os.getenv("OTP_MODE", "sms") # "sms" | "production"
    OTP_FILE_PATH: str = os.getenv("OTP_FILE_PATH", "")
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRY_MINUTES", os.getenv("OTP_EXPIRE_MINUTES", "5")))
    OTP_COOLDOWN_SECONDS: int = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", os.getenv("OTP_COOLDOWN_SECONDS", "60")))
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    DEV_MOCK_OTP: str = os.getenv("DEV_MOCK_OTP", "")
    
    # Kannel SMS Gateway Configuration
    KANNEL_URL: str = os.getenv("KANNEL_URL", "http://127.0.0.1:13013/cgi-bin/sendsms")
    KANNEL_USERNAME: str = os.getenv("KANNEL_USERNAME", "kannel")
    KANNEL_PASSWORD: str = os.getenv("KANNEL_PASSWORD", "kannel")
    KANNEL_FROM: str = os.getenv("KANNEL_FROM", "MEDKSK")
    KANNEL_DLR_MASK: str = os.getenv("KANNEL_DLR_MASK", "31")
    KANNEL_DLR_URL: str = os.getenv("KANNEL_DLR_URL", "")
    KANNEL_TIMEOUT_SECONDS: float = float(os.getenv("KANNEL_TIMEOUT_SECONDS", "3.0"))
    
    # Generic SMS Gateway Provider Configs
    SMS_API_KEY: str = os.getenv("SMS_API_KEY", "")
    SMS_SENDER_ID: str = os.getenv("SMS_SENDER_ID", "MEDKSK")
    SMS_TEMPLATE_ID: str = os.getenv("SMS_TEMPLATE_ID", "")
    
    # Integration Configs
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock") # mock | openai | gemini
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Bhashini / AI4Bharat Configs
    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")
    BHASHINI_USER_ID: str = os.getenv("BHASHINI_USER_ID", "")
    
    # ABDM Mock Setting
    ABDM_CONNECTED: bool = False # Configurable, real ABDM is mock until certified

    def __init__(self, **values):
        super().__init__(**values)
        if "SHOW_DEMO_OTP" not in values:
            if self.APP_ENV == "production":
                self.SHOW_DEMO_OTP = False
            else:
                raw = os.getenv("SHOW_DEMO_OTP")
                if raw is not None:
                    self.SHOW_DEMO_OTP = raw.lower() in ("true", "1", "yes")
                else:
                    self.SHOW_DEMO_OTP = True
    
    class Config:
        env_file = ".env"
        extra = "ignore"

    def get_cors_origins(self) -> List[str]:
        """Returns parsed, trimmed list of allowed CORS origins."""
        raw = self.CORS_ORIGINS or ""
        origins = [o.strip() for o in raw.split(",") if o.strip()]
        return origins

    def should_expose_demo_otp(self) -> bool:
        """Only expose demo OTP when APP_ENV is development AND SHOW_DEMO_OTP is True."""
        return self.APP_ENV == "development" and bool(self.SHOW_DEMO_OTP)

    def validate_security(self):
        """Enforces security boundaries and fails fast on insecure configurations."""
        if self.APP_ENV == "production":
            # 1. SECRET_KEY validation: FAIL FAST
            if not self.SECRET_KEY or self.SECRET_KEY in [
                "medikiosk_secret_key_2026_india_health",
                "replace_with_secure_random_secret",
                "replace_with_secure_random_secret_at_least_32_characters",
                "dev-insecure-secret-key-change-in-production-only-1234567890"
            ] or len(self.SECRET_KEY) < 32:
                raise RuntimeError(
                    "SECRET_KEY must be configured in production with a strong random secret (minimum 32 characters)."
                )

            # 2. OTP mode validation: Force production SMS mode; reject file OTP
            if self.OTP_MODE in ("file", "development") or self.OTP_MODE not in ("sms", "production"):
                raise RuntimeError(
                    "Insecure configuration: OTP_MODE must be set to 'production' or 'sms'. "
                    "File-based OTP delivery (OTP_MODE='file') is strictly prohibited in production. "
                    "Production must use an authenticated SMS provider (OTP_MODE='sms')."
                )

            # 3. OTP bypass validation: No dev mock OTP allowed in production
            if self.DEV_MOCK_OTP:
                raise RuntimeError(
                    "Insecure configuration: DEV_MOCK_OTP is strictly prohibited in production."
                )

            # 4. CORS origin validation: Wildcard strictly forbidden in production
            origins = self.get_cors_origins()
            if "*" in origins:
                raise RuntimeError(
                    "Insecure configuration: Wildcard CORS origin '*' is strictly prohibited in production."
                )

            # 5. Demo OTP validation: FAIL FAST if enabled in production
            if self.SHOW_DEMO_OTP:
                raise RuntimeError(
                    "Insecure configuration: SHOW_DEMO_OTP is strictly prohibited in production."
                )
        else:
            # Development fallback secret if not explicitly provided
            if not self.SECRET_KEY:
                self.SECRET_KEY = "medikiosk_dev_insecure_secret_key_do_not_use_in_prod_32chars"

settings = Settings()
settings.validate_security()
