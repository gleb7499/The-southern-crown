from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class GrowthRateBase(BaseModel):
    farm_id: int
    control_point_id: int
    chickens_quantity: int = Field(..., gt=0, description="Количество цыплят (положительное число)")
    growth_day: int = Field(..., ge=1, description="День развития (от 1)")
    initial_average_weight: int = Field(..., gt=0, description="Начальный средний вес в граммах")
    landing_date: date = Field(..., description="Дата посадки")
    closing_date: Optional[date] = Field(None, description="Дата закрытия (опционально)")


class GrowthRateCreate(GrowthRateBase):
    pass


class GrowthRateUpdate(BaseModel):
    """Схема для обновления норм развития. Все поля опциональны."""

    farm_id: Optional[int] = None
    control_point_id: Optional[int] = None
    chickens_quantity: Optional[int] = Field(None, gt=0, description="Количество цыплят")
    growth_day: Optional[int] = Field(None, ge=1, description="День развития")
    initial_average_weight: Optional[int] = Field(None, gt=0, description="Начальный средний вес")
    landing_date: Optional[date] = None
    closing_date: Optional[date] = None


class GrowthRate(GrowthRateBase):
    id: int

    class Config:
        from_attributes = True
