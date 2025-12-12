from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Security
    # WARNING: Change SECRET_KEY in production! Set via environment variable.
    # Generating random key here is only for development convenience.
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY_IN_PRODUCTION_AND_KEEP_IT_CONSISTENT"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Database
    DATABASE_URL: str = "sqlite:///./southern_crown.db"
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Environment
    ENV: str = "development"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
