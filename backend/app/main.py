import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, cameras, control_points, farms, reports
from app.core.config import settings
from app.core.database import Base, engine
from app.middleware.security import RateLimitMiddleware, SecurityHeadersMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)
logger.info("Database tables created/verified")

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
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.get("/")
def root():
    return {"message": "Southern Crown Admin API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
