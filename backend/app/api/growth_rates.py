import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.control_point import ControlPoint
from app.models.farm import Farm
from app.models.growth_rate import GrowthRate as GrowthRateModel
from app.models.user import User
from app.schemas.growth_rate import GrowthRate, GrowthRateCreate, GrowthRateUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[GrowthRate])
def get_growth_rates(
    farm_id: Optional[int] = Query(None, description="Фильтр по ID фермы"),
    control_point_id: Optional[int] = Query(None, description="Фильтр по ID точки контроля"),
    skip: int = Query(0, ge=0, description="Пропустить записей"),
    limit: int = Query(100, ge=1, le=1000, description="Максимум записей"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить список норм развития с фильтрацией.

    Фильтры:
    - **farm_id**: ID фермы
    - **control_point_id**: ID точки контроля
    """
    query = db.query(GrowthRateModel)

    if farm_id:
        query = query.filter(GrowthRateModel.farm_id == farm_id)

    if control_point_id:
        query = query.filter(GrowthRateModel.control_point_id == control_point_id)

    growth_rates = query.offset(skip).limit(limit).all()
    logger.info(f"Retrieved {len(growth_rates)} growth rates with filters")
    return growth_rates


@router.get("/{growth_rate_id}", response_model=GrowthRate)
def get_growth_rate(
    growth_rate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить конкретную норму развития по ID.
    """
    growth_rate = db.query(GrowthRateModel).filter(GrowthRateModel.id == growth_rate_id).first()

    if not growth_rate:
        raise HTTPException(
            status_code=404, detail=f"Growth rate with id {growth_rate_id} not found"
        )

    return growth_rate


@router.post("/", response_model=GrowthRate, status_code=201)
def create_growth_rate(
    growth_rate: GrowthRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Создать новую норму развития.

    - **farm_id**: ID фермы
    - **control_point_id**: ID точки контроля
    - **chickens_quantity**: Количество цыплят (положительное число)
    - **growth_day**: День развития (от 1)
    - **initial_average_weight**: Начальный средний вес в граммах
    - **landing_date**: Дата посадки
    - **closing_date**: Дата закрытия (опционально)

    Проверяется существование фермы и точки контроля, их соответствие друг другу.
    """
    # Проверка существования фермы
    farm = db.query(Farm).filter(Farm.id == growth_rate.farm_id).first()
    if not farm:
        logger.error(f"Farm not found: {growth_rate.farm_id}")
        raise HTTPException(status_code=404, detail=f"Farm with id {growth_rate.farm_id} not found")

    # Проверка существования точки контроля
    control_point = (
        db.query(ControlPoint).filter(ControlPoint.id == growth_rate.control_point_id).first()
    )
    if not control_point:
        logger.error(f"Control point not found: {growth_rate.control_point_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Control point with id {growth_rate.control_point_id} not found",
        )

    # Проверка что точка контроля принадлежит указанной ферме
    if control_point.farm_id != growth_rate.farm_id:  # type: ignore
        logger.error(
            f"Control point {growth_rate.control_point_id} does not belong to farm {growth_rate.farm_id}"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Control point {growth_rate.control_point_id} does not belong to farm {growth_rate.farm_id}",
        )

    # Валидация дат
    if growth_rate.closing_date and growth_rate.closing_date < growth_rate.landing_date:
        raise HTTPException(
            status_code=400,
            detail="Closing date cannot be earlier than landing date",
        )

    # Создание записи
    db_growth_rate = GrowthRateModel(**growth_rate.model_dump())
    db.add(db_growth_rate)
    db.commit()
    db.refresh(db_growth_rate)

    logger.info(
        f"Created growth rate: id={db_growth_rate.id}, farm={growth_rate.farm_id}, cp={growth_rate.control_point_id}"
    )
    return db_growth_rate


@router.put("/{growth_rate_id}", response_model=GrowthRate)
def update_growth_rate(
    growth_rate_id: int,
    growth_rate_update: GrowthRateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Обновить существующую норму развития.

    Можно обновить любые поля. Все поля опциональны.
    Проверяется валидность новых значений farm_id и control_point_id.
    """
    # Получаем существующую запись
    db_growth_rate = db.query(GrowthRateModel).filter(GrowthRateModel.id == growth_rate_id).first()

    if not db_growth_rate:
        raise HTTPException(
            status_code=404, detail=f"Growth rate with id {growth_rate_id} not found"
        )

    # Обновляем только те поля, которые переданы
    update_data = growth_rate_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Если обновляется farm_id - проверяем существование
    if "farm_id" in update_data:
        farm = db.query(Farm).filter(Farm.id == update_data["farm_id"]).first()
        if not farm:
            raise HTTPException(
                status_code=404, detail=f"Farm with id {update_data['farm_id']} not found"
            )

    # Если обновляется control_point_id - проверяем существование
    if "control_point_id" in update_data:
        control_point = (
            db.query(ControlPoint)
            .filter(ControlPoint.id == update_data["control_point_id"])
            .first()
        )
        if not control_point:
            raise HTTPException(
                status_code=404,
                detail=f"Control point with id {update_data['control_point_id']} not found",
            )

    # Проверка соответствия фермы и точки контроля (если оба обновляются или один обновляется)
    final_farm_id = update_data.get("farm_id", db_growth_rate.farm_id)
    final_cp_id = update_data.get("control_point_id", db_growth_rate.control_point_id)

    control_point_check = db.query(ControlPoint).filter(ControlPoint.id == final_cp_id).first()
    if control_point_check and control_point_check.farm_id != final_farm_id:  # type: ignore
        raise HTTPException(
            status_code=400,
            detail=f"Control point {final_cp_id} does not belong to farm {final_farm_id}",
        )

    # Валидация дат
    final_landing_date = update_data.get("landing_date", db_growth_rate.landing_date)
    final_closing_date = update_data.get("closing_date", db_growth_rate.closing_date)

    if final_closing_date and final_closing_date < final_landing_date:
        raise HTTPException(
            status_code=400,
            detail="Closing date cannot be earlier than landing date",
        )

    # Применяем обновления
    for field, value in update_data.items():
        setattr(db_growth_rate, field, value)

    db.commit()
    db.refresh(db_growth_rate)

    logger.info(f"Updated growth rate: id={growth_rate_id}, fields={list(update_data.keys())}")
    return db_growth_rate


@router.delete("/{growth_rate_id}")
def delete_growth_rate(
    growth_rate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Удалить норму развития по ID.

    - **growth_rate_id**: ID нормы развития для удаления
    """
    growth_rate = db.query(GrowthRateModel).filter(GrowthRateModel.id == growth_rate_id).first()

    if not growth_rate:
        raise HTTPException(
            status_code=404, detail=f"Growth rate with id {growth_rate_id} not found"
        )

    db.delete(growth_rate)
    db.commit()

    logger.info(f"Deleted growth rate: id={growth_rate_id}")
    return {"message": f"Growth rate {growth_rate_id} deleted successfully"}
