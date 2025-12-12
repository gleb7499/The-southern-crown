from pydantic import BaseModel


class CameraBase(BaseModel):
    name: str
    url: str
    control_point_id: int


class CameraCreate(CameraBase):
    pass


class Camera(CameraBase):
    id: int

    class Config:
        from_attributes = True
