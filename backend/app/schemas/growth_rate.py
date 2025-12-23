from pydantic import BaseModel
from datetime import date
from typing import Optional


class GrowthRateBase(BaseModel):
    farm_id: int
    control_point_id: int
    chickens_quantity: int
    growth_day: int
    initial_average_weight: int
    landing_date: date
    closing_date: Optional[date] = None


class GrowthRateCreate(GrowthRateBase):
    pass


class GrowthRate(GrowthRateBase):
    id: int

    class Config:
        from_attributes = True
