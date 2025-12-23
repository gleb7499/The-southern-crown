import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.farm import Farm as FarmModel
from app.models.user import User
from app.schemas.farm_schema import Farm, FarmCreate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/farms", response_model=List[Farm])
def get_farms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of farms with pagination."""
    farms = db.query(FarmModel).offset(skip).limit(limit).all()
    logger.info(f"Returning {len(farms)} farms")
    return farms


@router.post("/farms", response_model=Farm)
def create_farm(
    farm: FarmCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Create a new farm."""
    # Check if admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db_farm = FarmModel(**farm.dict())
    db.add(db_farm)
    db.commit()
    db.refresh(db_farm)

    logger.info(f"Created farm: {db_farm.id} - {db_farm.name}")
    return db_farm
