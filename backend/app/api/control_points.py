from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.farm import (
    ControlPoint, ControlPointCreate, ControlPointWithDetails, ControlPointCreateFull
)
from app.models.farm import ControlPoint as ControlPointModel, Building, Farm
from app.api.deps import get_current_user
from app.models.user import User
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[ControlPointWithDetails])
def get_control_points(
    farm_ids: Optional[str] = None,
    building_ids: Optional[str] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of control points with optional filtering and pagination.
    
    - **farm_ids**: Comma-separated list of farm IDs to filter by
    - **building_ids**: Comma-separated list of building IDs to filter by
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return (pagination)
    """
    query = db.query(
        ControlPointModel,
        Building.name.label("building_name"),
        Farm.name.label("farm_name")
    ).select_from(ControlPointModel
    ).join(Building, ControlPointModel.building_id == Building.id
    ).join(Farm, Building.farm_id == Farm.id)
    
    if farm_ids:
        try:
            farm_id_list = [int(x.strip()) for x in farm_ids.split(",") if x.strip()]
            query = query.filter(Farm.id.in_(farm_id_list))
            logger.info(f"Filtering by farm IDs: {farm_id_list}")
        except ValueError as e:
            logger.error(f"Invalid farm_ids format: {farm_ids}")
            raise HTTPException(status_code=400, detail="Invalid farm_ids format")
    
    if building_ids:
        try:
            building_id_list = [int(x.strip()) for x in building_ids.split(",") if x.strip()]
            query = query.filter(Building.id.in_(building_id_list))
            logger.info(f"Filtering by building IDs: {building_id_list}")
        except ValueError as e:
            logger.error(f"Invalid building_ids format: {building_ids}")
            raise HTTPException(status_code=400, detail="Invalid building_ids format")
    
    # Apply pagination
    results = query.offset(skip).limit(limit).all()
    
    control_points = []
    for cp, building_name, farm_name in results:
        control_points.append(ControlPointWithDetails(
            id=cp.id,
            name=cp.name,
            building_id=cp.building_id,
            day_of_development=cp.day_of_development,
            average_deviation=cp.average_deviation,
            building_name=building_name,
            farm_name=farm_name
        ))
    
    logger.info(f"Returning {len(control_points)} control points")
    return control_points


@router.post("/", response_model=ControlPoint)
def create_control_point(
    control_point: ControlPointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new control point.
    
    Requires building_id to exist in database.
    """
    # Verify building exists
    building = db.query(Building).filter(Building.id == control_point.building_id).first()
    if not building:
        logger.error(f"Building not found: {control_point.building_id}")
        raise HTTPException(status_code=404, detail="Building not found")
    
    db_control_point = ControlPointModel(**control_point.dict())
    db.add(db_control_point)
    db.commit()
    db.refresh(db_control_point)
    
    logger.info(f"Created control point: {db_control_point.id} - {db_control_point.name}")
    return db_control_point


@router.post("/full", response_model=ControlPoint)
def create_control_point_full(
    data: ControlPointCreateFull,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new control point along with farm and building if they don't exist.
    
    This endpoint is designed for the Settings page where users can create
    a complete structure by providing names only.
    """
    # Check if admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Find or create farm
    farm = db.query(Farm).filter(Farm.name == data.farm_name).first()
    if not farm:
        farm = Farm(name=data.farm_name)
        db.add(farm)
        db.flush()
        logger.info(f"Created farm: {farm.id} - {farm.name}")
    
    # Find or create building
    building = db.query(Building).filter(
        Building.name == data.building_name,
        Building.farm_id == farm.id
    ).first()
    if not building:
        building = Building(name=data.building_name, farm_id=farm.id)
        db.add(building)
        db.flush()
        logger.info(f"Created building: {building.id} - {building.name}")
    
    # Create control point
    control_point = ControlPointModel(
        name=data.control_point_name,
        building_id=building.id,
        day_of_development=0,
        average_deviation=0
    )
    db.add(control_point)
    db.commit()
    db.refresh(control_point)
    
    logger.info(f"Created control point: {control_point.id} - {control_point.name}")
    return control_point


@router.get("/{control_point_id}", response_model=ControlPoint)
def get_control_point(
    control_point_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific control point by ID."""
    control_point = db.query(ControlPointModel).filter(
        ControlPointModel.id == control_point_id
    ).first()
    
    if not control_point:
        raise HTTPException(status_code=404, detail="Control point not found")
    
    return control_point
