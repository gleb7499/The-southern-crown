import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, cameras, control_points, farms, growth_rates, reports
from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.scheduler import shutdown_scheduler, start_scheduler
from app.core.security import get_password_hash
from app.init_db import init_test_data
from app.middleware.security import RateLimitMiddleware, SecurityHeadersMiddleware
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create database tables (async)
async def init_db():
    """Инициализация базы данных - создание таблиц с повторными попытками"""
    max_retries = 10
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created/verified")
            return
        except (OperationalError, Exception) as e:
            if attempt < max_retries - 1:
                logger.warning(f"Не удалось подключиться к БД (попытка {attempt + 1}/{max_retries}): {e}. Повтор через {retry_delay}с...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error(f"Не удалось подключиться к БД после {max_retries} попыток: {e}")
                raise


async def create_admin_user():
    """Создает администратора при первом запуске, если его еще нет"""
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            async with AsyncSessionLocal() as db:
                # Проверяем, существует ли уже администратор
                result = await db.execute(select(User).filter(User.email == settings.ADMIN_EMAIL))
                admin = result.scalar_one_or_none()

                if not admin:
                    # Создаем администратора
                    admin = User(
                        email=settings.ADMIN_EMAIL,
                        hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                        is_active=True,
                        is_admin=True,
                    )
                    db.add(admin)
                    await db.commit()
                    logger.info(
                        f"Создан администратор: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}"
                    )
                else:
                    logger.info(f"Администратор уже существует: {settings.ADMIN_EMAIL}")
                return
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Ошибка при создании администратора (попытка {attempt + 1}/{max_retries}): {e}. Повтор через {retry_delay}с...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error(f"Не удалось создать администратора после {max_retries} попыток: {e}")
                # Не поднимаем исключение, чтобы приложение могло запуститься

app = FastAPI(
    title="Southern Crown Admin API",
    description="Farm management admin panel API",
    version="1.0.0",
    debug=settings.DEBUG,
)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting - more lenient in development
if settings.ENV == "production":
    app.add_middleware(RateLimitMiddleware, calls=100, period=60)
else:
    app.add_middleware(RateLimitMiddleware, calls=1000, period=60)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(control_points.router, prefix="/api/control-points", tags=["control-points"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["cameras"])
app.include_router(farms.router, prefix="/api", tags=["farms"])
app.include_router(growth_rates.router, prefix="/api/growth-rates", tags=["growth-rates"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.get("/")
def root():
    return {"message": "Southern Crown Admin API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """Запуск планировщика и инициализация БД при старте приложения"""
    await init_db()
    await create_admin_user()
    # Создаем тестовые данные, если их еще нет
    try:
        await init_test_data()
    except Exception as e:
        logger.error(f"Ошибка при создании тестовых данных: {e}")
        # Не останавливаем приложение, если тестовые данные не создались
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    """Остановка планировщика при остановке приложения"""
    shutdown_scheduler()
    await engine.dispose()
