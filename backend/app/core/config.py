from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Security
    # WARNING: Change SECRET_KEY in production! Set via environment variable.
    # Generating random key here is only for development convenience.
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY_IN_PRODUCTION_AND_KEEP_IT_CONSISTENT"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    # For async SQLAlchemy we use postgresql+asyncpg
    # Format: postgresql://user:password@host:port/dbname (will be automatically converted to postgresql+asyncpg://)
    DATABASE_URL: str = "postgresql://postgres:postgres@postgres:5432/southern_crown"

    # CORS
    ALLOWED_ORIGINS: str = "*"

    # Environment
    ENV: str = "development"
    DEBUG: bool = True

    # Admin User Settings
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "admin123"

    # Video Recording Settings
    # Recording start times in HH:MM format, comma-separated
    # For example: "08:00,14:00" for 2 times a day or "08:00,14:00,20:00" for 3 times
    VIDEO_RECORDING_SCHEDULE: str = "18:10,14:00"
    # Recording duration in seconds
    VIDEO_RECORDING_DURATION: int = 300  # 5 minutes by default
    # Path for saving recordings
    VIDEO_RECORDING_PATH: str = "./data/recordings"

    class Config:
        env_file = ".env"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
