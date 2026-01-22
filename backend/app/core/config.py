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
    # Для async SQLAlchemy используем postgresql+asyncpg
    # Формат: postgresql://user:password@host:port/dbname (будет автоматически преобразован в postgresql+asyncpg://)
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
    # Время запуска записей в формате HH:MM, разделенные запятыми
    # Например: "08:00,14:00" для 2 раз в день или "08:00,14:00,20:00" для 3 раз
    VIDEO_RECORDING_SCHEDULE: str = "18:10,14:00"
    # Длительность записи в секундах
    VIDEO_RECORDING_DURATION: int = 300  # 5 минут по умолчанию
    # Путь для сохранения записей
    VIDEO_RECORDING_PATH: str = "./data/recordings"

    class Config:
        env_file = ".env"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
