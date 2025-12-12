from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.farm import Farm, FarmCreate, Building, BuildingCreate
from app.models.farm import Farm as FarmModel, Building as BuildingModel
from app.api.deps import get_current_user
from app.models.user import User
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/farms", response_model=List[Farm])
def get_farms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of farms with pagination."""
    farms = db.query(FarmModel).offset(skip).limit(limit).all()
    logger.info(f"Returning {len(farms)} farms")
    return farms


@router.post("/farms", response_model=Farm)
def create_farm(
    farm: FarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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


@router.get("/buildings", response_model=List[Building])
def get_buildings(
    farm_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of buildings with optional farm filter and pagination."""
    query = db.query(BuildingModel)
    
    if farm_id:
        query = query.filter(BuildingModel.farm_id == farm_id)
    
    buildings = query.offset(skip).limit(limit).all()
    logger.info(f"Returning {len(buildings)} buildings")
    return buildings


@router.post("/buildings", response_model=Building)
def create_building(
    building: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new building."""
    # Check if admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Verify farm exists
    farm = db.query(FarmModel).filter(FarmModel.id == building.farm_id).first()
    if not farm:
        logger.error(f"Farm not found: {building.farm_id}")
        raise HTTPException(status_code=404, detail="Farm not found")
    
    db_building = BuildingModel(**building.dict())
    db.add(db_building)
    db.commit()
    db.refresh(db_building)
    
    logger.info(f"Created building: {db_building.id} - {db_building.name}")
    return db_building
