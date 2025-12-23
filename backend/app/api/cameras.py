from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.camera import Camera as CameraModel
from app.models.control_point import ControlPoint
from app.models.farm import Farm
from app.models.user import User
from app.schemas.camera import Camera, CameraCreate

router = APIRouter()


@router.get("/", response_model=List[Camera])
def get_cameras(
    control_point_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить список камер с опциональной фильтрацией по точке контроля.

    - **control_point_id**: ID точки контроля для фильтрации (опционально)
    """
    query = db.query(CameraModel)

    if control_point_id:
        query = query.filter(CameraModel.control_point_id == control_point_id)

    return query.all()


@router.post("/", response_model=Camera, status_code=201)
def create_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Создать новую камеру.

    - **name**: Название камеры
    - **url**: URL потока камеры
    - **farm_id**: Ферма с id фермой
    - **control_point_id**: ID точки контроля, к которой привязана камера

    Проверяется существование фермы и точки контроля, а также их соответствие.
    """
    # Проверка существования фермы
    farm = db.query(Farm).filter(Farm.id == camera.farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm with id {camera.farm_id} not found")

    # Проверка существования точки контроля
    control_point = (
        db.query(ControlPoint).filter(ControlPoint.id == camera.control_point_id).first()
    )
    if not control_point:
        raise HTTPException(
            status_code=404,
            detail=f"Control point with id {camera.control_point_id} not found",
        )

    # Проверка что точка контроля принадлежит указанной ферме
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
    db.commit()
    db.refresh(db_camera)
    return db_camera


@router.delete("/{camera_id}")
def delete_camera(
    camera_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Удалить камеру по ID.

    - **camera_id**: ID камеры для удаления
    """
    camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    db.delete(camera)
    db.commit()

    return {"message": "Camera deleted successfully"}
