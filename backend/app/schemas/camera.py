from pydantic import BaseModel, Field


class CameraBase(BaseModel):
    name: str
    url: str
    farm_id: int = Field(..., description="Ферма с id фермой")
    control_point_id: int


class CameraCreate(CameraBase):
    pass


class Camera(CameraBase):
    id: int

    class Config:
        from_attributes = True
