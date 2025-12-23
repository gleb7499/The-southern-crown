from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.camera import Camera as CameraModel
from app.models.user import User
from app.schemas.camera import Camera, CameraCreate

router = APIRouter()


@router.get("/", response_model=List[Camera])
def get_cameras(
    control_point_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CameraModel)

    if control_point_id:
        query = query.filter(CameraModel.control_point_id == control_point_id)

    return query.all()


@router.post("/", response_model=Camera)
def create_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_camera = CameraModel(**camera.dict())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera


@router.delete("/{camera_id}")
def delete_camera(
    camera_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    camera = db.query(CameraModel).filter(CameraModel.id == camera_id).first()

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    db.delete(camera)
    db.commit()

    return {"message": "Camera deleted successfully"}
