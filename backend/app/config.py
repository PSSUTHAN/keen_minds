import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MediKiosk - AI Clinical History Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./medikiosk.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "medikiosk_secret_key_2026_india_health")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # OTP Configuration
    OTP_MODE: str = os.getenv("OTP_MODE", "development") # "development" | "production"
    OTP_EXPIRE_MINUTES: int = 5
    OTP_COOLDOWN_SECONDS: int = int(os.getenv("OTP_COOLDOWN_SECONDS", "30"))
    OTP_MAX_ATTEMPTS: int = 5
    DEV_MOCK_OTP: str = "123456" # Mock OTP accepted in development mode
    
    # SMS Gateway Provider Configs
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
    
    class Config:
        env_file = ".env"

settings = Settings()
