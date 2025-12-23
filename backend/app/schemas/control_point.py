from typing import Optional

from pydantic import BaseModel


class ControlPointBase(BaseModel):
    name: str
    frame_name: str
    farm_id: int


class ControlPointCreate(ControlPointBase):
    pass


class ControlPointCreateFull(BaseModel):
    """Schema for creating control point with farm and frame names"""

    farm_name: str
    frame_name: str
    control_point_name: str


class ControlPoint(ControlPointBase):
    id: int

    class Config:
        from_attributes = True


class ControlPointWithDetails(ControlPoint):
    farm_name: Optional[str] = None
