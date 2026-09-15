import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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
async def get_growth_rates(
    farm_id: Optional[int] = Query(None, description="Filter by farm ID"),
    control_point_id: Optional[int] = Query(None, description="Filter by control point ID"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the list of growth rates with filtering.

    Filters:
    - **farm_id**: Farm ID
    - **control_point_id**: Control point ID
    """
    query = select(GrowthRateModel)

    if farm_id:
        query = query.where(GrowthRateModel.farm_id == farm_id)

    if control_point_id:
        query = query.where(GrowthRateModel.control_point_id == control_point_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    growth_rates = result.scalars().all()
    logger.info(f"Retrieved {len(growth_rates)} growth rates with filters")
    return growth_rates


@router.get("/{growth_rate_id}", response_model=GrowthRate)
async def get_growth_rate(
    growth_rate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific growth rate by ID.
    """
    result = await db.execute(
        select(GrowthRateModel).filter(GrowthRateModel.id == growth_rate_id)
    )
    growth_rate = result.scalar_one_or_none()

    if not growth_rate:
        raise HTTPException(
            status_code=404, detail=f"Growth rate with id {growth_rate_id} not found"
        )

    return growth_rate


@router.post("/", response_model=GrowthRate, status_code=201)
async def create_growth_rate(
    growth_rate: GrowthRateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new growth rate.

    - **farm_id**: Farm ID
    - **control_point_id**: Control point ID
    - **chickens_quantity**: Number of chickens (positive number)
    - **growth_day**: Growth day (from 1)
    - **initial_average_weight**: Initial average weight in grams
    - **landing_date**: Landing date
    - **closing_date**: Closing date (optional)

    The existence of the farm and control point is checked, as well as their correspondence.
    """
    # Check that the farm exists
    farm_result = await db.execute(select(Farm).filter(Farm.id == growth_rate.farm_id))
    farm = farm_result.scalar_one_or_none()
    if not farm:
        logger.error(f"Farm not found: {growth_rate.farm_id}")
        raise HTTPException(status_code=404, detail=f"Farm with id {growth_rate.farm_id} not found")

    # Check that the control point exists
    cp_result = await db.execute(
        select(ControlPoint).filter(ControlPoint.id == growth_rate.control_point_id)
    )
    control_point = cp_result.scalar_one_or_none()
    if not control_point:
        logger.error(f"Control point not found: {growth_rate.control_point_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Control point with id {growth_rate.control_point_id} not found",
        )

    # Check that the control point belongs to the specified farm
    if control_point.farm_id != growth_rate.farm_id:  # type: ignore
        logger.error(
            f"Control point {growth_rate.control_point_id} does not belong to farm {growth_rate.farm_id}"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Control point {growth_rate.control_point_id} does not belong to farm {growth_rate.farm_id}",
        )

    # Date validation
    if growth_rate.closing_date and growth_rate.closing_date < growth_rate.landing_date:
        raise HTTPException(
            status_code=400,
            detail="Closing date cannot be earlier than landing date",
        )

    # Create the record
    db_growth_rate = GrowthRateModel(**growth_rate.model_dump())
    db.add(db_growth_rate)
    await db.commit()
    await db.refresh(db_growth_rate)

    logger.info(
        f"Created growth rate: id={db_growth_rate.id}, farm={growth_rate.farm_id}, cp={growth_rate.control_point_id}"
    )
    return db_growth_rate


@router.put("/{growth_rate_id}", response_model=GrowthRate)
async def update_growth_rate(
    growth_rate_id: int,
    growth_rate_update: GrowthRateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing growth rate.

    Any fields can be updated. All fields are optional.
    The validity of the new farm_id and control_point_id values is checked.
    """
    # Get the existing record
    result = await db.execute(
        select(GrowthRateModel).filter(GrowthRateModel.id == growth_rate_id)
    )
    db_growth_rate = result.scalar_one_or_none()

    if not db_growth_rate:
        raise HTTPException(
            status_code=404, detail=f"Growth rate with id {growth_rate_id} not found"
        )

    # Update only the fields that were provided
    update_data = growth_rate_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # If farm_id is being updated - check that it exists
    if "farm_id" in update_data:
        farm_result = await db.execute(select(Farm).filter(Farm.id == update_data["farm_id"]))
        farm = farm_result.scalar_one_or_none()
        if not farm:
            raise HTTPException(
                status_code=404, detail=f"Farm with id {update_data['farm_id']} not found"
            )

    # If control_point_id is being updated - check that it exists
    if "control_point_id" in update_data:
        cp_result = await db.execute(
            select(ControlPoint).filter(ControlPoint.id == update_data["control_point_id"])
        )
        control_point = cp_result.scalar_one_or_none()
        if not control_point:
            raise HTTPException(
                status_code=404,
                detail=f"Control point with id {update_data['control_point_id']} not found",
            )

    # Check the correspondence of the farm and control point (if both are being updated or one of them)
    final_farm_id = update_data.get("farm_id", db_growth_rate.farm_id)
    final_cp_id = update_data.get("control_point_id", db_growth_rate.control_point_id)

    cp_check_result = await db.execute(select(ControlPoint).filter(ControlPoint.id == final_cp_id))
    control_point_check = cp_check_result.scalar_one_or_none()
    if control_point_check and control_point_check.farm_id != final_farm_id:  # type: ignore
        raise HTTPException(
            status_code=400,
            detail=f"Control point {final_cp_id} does not belong to farm {final_farm_id}",
        )

    # Date validation
    final_landing_date = update_data.get("landing_date", db_growth_rate.landing_date)
    final_closing_date = update_data.get("closing_date", db_growth_rate.closing_date)

    if final_closing_date and final_closing_date < final_landing_date:
        raise HTTPException(
            status_code=400,
            detail="Closing date cannot be earlier than landing date",
        )

    # Apply the updates
    for field, value in update_data.items():
        setattr(db_growth_rate, field, value)

    await db.commit()
    await db.refresh(db_growth_rate)

    logger.info(f"Updated growth rate: id={growth_rate_id}, fields={list(update_data.keys())}")
    return db_growth_rate


@router.delete("/{growth_rate_id}")
async def delete_growth_rate(
    growth_rate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a growth rate by ID.

    - **growth_rate_id**: ID of the growth rate to delete
    """
    result = await db.execute(
        select(GrowthRateModel).filter(GrowthRateModel.id == growth_rate_id)
    )
    growth_rate = result.scalar_one_or_none()

    if not growth_rate:
        raise HTTPException(
            status_code=404, detail=f"Growth rate with id {growth_rate_id} not found"
        )

    await db.delete(growth_rate)
    await db.commit()

    logger.info(f"Deleted growth rate: id={growth_rate_id}")
    return {"message": f"Growth rate {growth_rate_id} deleted successfully"}
