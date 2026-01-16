from pathlib import Path
from typing import Any, List

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Security
    # IMPORTANT: secrets must come ONLY from environment (.env).
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = Field(default="HS256")

    # Short-lived access token; renewed via refresh token.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(..., ge=1, le=24 * 60)

    # Long-lived refresh token; stored server-side (by jti) for rotation/revocation.
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(..., ge=1, le=365)

    # Seed admin user (dev only; still configured via env to avoid hardcoding credentials)
    ADMIN_EMAIL: str = Field(default="admin@example.com")
    ADMIN_PASSWORD: str = Field(..., min_length=8)

    # Dev/test helpers
    RESET_DB_ON_START: bool = Field(default=False)

    # Database - will be set to absolute path in validator
    DATABASE_URL: str = Field(default="")

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        """Resolve DATABASE_URL to absolute path for SQLite."""
        if not self.DATABASE_URL or self.DATABASE_URL == "":
            # Default: backend/data/southern_crown.db
            app_dir = Path(__file__).parent.parent.parent  # backend/
            db_path = app_dir / "data" / "southern_crown.db"
            db_path.parent.mkdir(parents=True, exist_ok=True)
            self.DATABASE_URL = f"sqlite:///{db_path}"
        elif self.DATABASE_URL.startswith("sqlite:///./"):
            # Relative path - convert to absolute
            rel_path = self.DATABASE_URL.replace("sqlite:///./", "")
            app_dir = Path(__file__).parent.parent.parent
            abs_path = (app_dir / rel_path).resolve()
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            self.DATABASE_URL = f"sqlite:///{abs_path}"
        return self

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
