from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # Clerk Auth
    CLERK_SECRET_KEY: Optional[str] = None
    
    # Dev mode
    DEV_MODE: bool = False
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: Optional[str] = None
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Animation Generator"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
