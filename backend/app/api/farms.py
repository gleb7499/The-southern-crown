from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.farm import Farm, Building
from app.models.farm import Farm as FarmModel, Building as BuildingModel
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/farms", response_model=List[Farm])
def get_farms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(FarmModel).all()


@router.get("/buildings", response_model=List[Building])
def get_buildings(
    farm_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BuildingModel)
    
    if farm_id:
        query = query.filter(BuildingModel.farm_id == farm_id)
    
    return query.all()
