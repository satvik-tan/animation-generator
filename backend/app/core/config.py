from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # Clerk Auth
    CLERK_JWT_KEY: Optional[str] = None
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Animation Generator"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
