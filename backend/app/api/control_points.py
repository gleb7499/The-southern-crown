from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.farm import ControlPoint, ControlPointCreate, ControlPointWithDetails
from app.models.farm import ControlPoint as ControlPointModel, Building, Farm
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[ControlPointWithDetails])
def get_control_points(
    farm_ids: str = None,
    building_ids: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        ControlPointModel,
        Building.name.label("building_name"),
        Farm.name.label("farm_name")
    ).join(Building).join(Farm)
    
    if farm_ids:
        farm_id_list = [int(x) for x in farm_ids.split(",")]
        query = query.filter(Farm.id.in_(farm_id_list))
    
    if building_ids:
        building_id_list = [int(x) for x in building_ids.split(",")]
        query = query.filter(Building.id.in_(building_id_list))
    
    results = query.all()
    
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
    
    return control_points


@router.post("/", response_model=ControlPoint)
def create_control_point(
    control_point: ControlPointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_control_point = ControlPointModel(**control_point.dict())
    db.add(db_control_point)
    db.commit()
    db.refresh(db_control_point)
    return db_control_point


@router.get("/{control_point_id}", response_model=ControlPoint)
def get_control_point(
    control_point_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    control_point = db.query(ControlPointModel).filter(
        ControlPointModel.id == control_point_id
    ).first()
    
    if not control_point:
        raise HTTPException(status_code=404, detail="Control point not found")
    
    return control_point
