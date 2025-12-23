import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.control_point import ControlPoint as ControlPointModel
from app.models.farm import Farm
from app.models.user import User
from app.schemas.control_point import (
    ControlPoint,
    ControlPointCreate,
    ControlPointCreateFull,
    ControlPointWithDetails,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[ControlPointWithDetails])
def get_control_points(
    farm_ids: Optional[str] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить список точек контроля с опциональной фильтрацией и пагинацией.

    - **farm_ids**: Список ID ферм через запятую для фильтрации
    - **skip**: Количество записей для пропуска (пагинация)
    - **limit**: Максимальное количество возвращаемых записей (пагинация)
    """
    query = (
        db.query(ControlPointModel, Farm.name.label("farm_name"))
        .select_from(ControlPointModel)
        .join(Farm, ControlPointModel.farm_id == Farm.id)
    )

    if farm_ids:
        try:
            farm_id_list = [int(x.strip()) for x in farm_ids.split(",") if x.strip()]
            query = query.filter(Farm.id.in_(farm_id_list))
            logger.info(f"Filtering by farm IDs: {farm_id_list}")
        except ValueError:
            logger.error(f"Invalid farm_ids format: {farm_ids}")
            raise HTTPException(status_code=400, detail="Invalid farm_ids format")

    # Apply pagination
    results = query.offset(skip).limit(limit).all()

    control_points = []
    for cp, farm_name in results:
        control_points.append(
            ControlPointWithDetails(
                id=cp.id,
                name=cp.name,
                frame_name=cp.frame_name,
                farm_id=cp.farm_id,
                farm_name=farm_name,
            )
        )

    logger.info(f"Returning {len(control_points)} control points")
    return control_points


@router.post("/", response_model=ControlPoint)
def create_control_point(
    control_point: ControlPointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Создать новую точку контроля.

    Требуется существующий farm_id в базе данных.
    """
    # Verify farm exists
    farm = db.query(Farm).filter(Farm.id == control_point.farm_id).first()
    if not farm:
        logger.error(f"Farm not found: {control_point.farm_id}")
        raise HTTPException(status_code=404, detail="Farm not found")

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
    current_user: User = Depends(get_current_user),
):
    """
    Создать новую точку контроля вместе с фермой, если она не существует.

    Этот endpoint предназначен для страницы Настроек, где пользователи могут создать
    полную структуру, указав только названия.
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

    # Create control point
    control_point = ControlPointModel(
        name=data.control_point_name, frame_name=data.frame_name, farm_id=farm.id
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
    current_user: User = Depends(get_current_user),
):
    """Получить конкретную точку контроля по ID."""
    control_point = (
        db.query(ControlPointModel).filter(ControlPointModel.id == control_point_id).first()
    )

    if not control_point:
        raise HTTPException(status_code=404, detail="Control point not found")

    return control_point
