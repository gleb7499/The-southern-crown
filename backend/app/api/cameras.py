from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.camera import Camera as CameraModel
from app.models.control_point import ControlPoint
from app.models.farm import Farm
from app.models.user import User
from app.schemas.camera import Camera, CameraCreate

router = APIRouter()


@router.get("/", response_model=List[Camera])
async def get_cameras(
    control_point_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the list of cameras with optional filtering by control point.

    - **control_point_id**: Control point ID for filtering (optional)
    """
    query = select(CameraModel)

    if control_point_id:
        query = query.filter(CameraModel.control_point_id == control_point_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=Camera, status_code=201)
async def create_camera(
    camera: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new camera.

    - **name**: Camera name
    - **url**: Camera stream URL
    - **farm_id**: Farm with the farm id
    - **control_point_id**: ID of the control point the camera is attached to

    The existence of the farm and control point is checked, as well as their correspondence.
    """
    # Check that the farm exists
    farm_result = await db.execute(select(Farm).filter(Farm.id == camera.farm_id))
    farm = farm_result.scalar_one_or_none()
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm with id {camera.farm_id} not found")

    # Check that the control point exists
    cp_result = await db.execute(
        select(ControlPoint).filter(ControlPoint.id == camera.control_point_id)
    )
    control_point = cp_result.scalar_one_or_none()
    if not control_point:
        raise HTTPException(
            status_code=404,
            detail=f"Control point with id {camera.control_point_id} not found",
        )

    # Check that the control point belongs to the specified farm
    if control_point.farm_id != camera.farm_id:  # type: ignore
        raise HTTPException(
            status_code=400,
            detail=(
                f"Control point {camera.control_point_id} "
                f"does not belong to farm {camera.farm_id}"
            ),
        )

    db_camera = CameraModel(**camera.dict())
    db.add(db_camera)
    await db.commit()
    await db.refresh(db_camera)
    return db_camera


@router.delete("/{camera_id}")
async def delete_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a camera by ID.

    - **camera_id**: ID of the camera to delete
    """
    result = await db.execute(select(CameraModel).filter(CameraModel.id == camera_id))
    camera = result.scalar_one_or_none()

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(camera)
    await db.commit()

    return {"message": "Camera deleted successfully"}
