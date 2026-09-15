from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class GrowthRateBase(BaseModel):
    farm_id: int
    control_point_id: int
    chickens_quantity: int = Field(..., gt=0, description="Number of chickens (positive number)")
    growth_day: int = Field(..., ge=1, description="Growth day (from 1)")
    initial_average_weight: int = Field(..., gt=0, description="Initial average weight in grams")
    landing_date: date = Field(..., description="Landing date")
    closing_date: Optional[date] = Field(None, description="Closing date (optional)")


class GrowthRateCreate(GrowthRateBase):
    pass


class GrowthRateUpdate(BaseModel):
    """Schema for updating growth rates. All fields are optional."""

    farm_id: Optional[int] = None
    control_point_id: Optional[int] = None
    chickens_quantity: Optional[int] = Field(None, gt=0, description="Number of chickens")
    growth_day: Optional[int] = Field(None, ge=1, description="Growth day")
    initial_average_weight: Optional[int] = Field(None, gt=0, description="Initial average weight")
    landing_date: Optional[date] = None
    closing_date: Optional[date] = None


class GrowthRate(GrowthRateBase):
    id: int

    class Config:
        from_attributes = True
