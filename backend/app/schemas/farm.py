from pydantic import BaseModel
from typing import List, Optional


class FarmBase(BaseModel):
    name: str


class FarmCreate(FarmBase):
    pass


class Farm(FarmBase):
    id: int

    class Config:
        from_attributes = True


class BuildingBase(BaseModel):
    name: str
    farm_id: int


class BuildingCreate(BuildingBase):
    pass


class Building(BuildingBase):
    id: int

    class Config:
        from_attributes = True


class ControlPointBase(BaseModel):
    name: str
    building_id: int


class ControlPointCreate(ControlPointBase):
    pass


class ControlPoint(ControlPointBase):
    id: int
    day_of_development: int
    average_deviation: int

    class Config:
        from_attributes = True


class ControlPointWithDetails(ControlPoint):
    building_name: Optional[str] = None
    farm_name: Optional[str] = None
