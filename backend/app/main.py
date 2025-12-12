from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.api import auth, control_points, cameras, farms, reports

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Southern Crown Admin API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
