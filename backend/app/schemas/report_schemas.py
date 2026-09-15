from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


# === Schemas for CRUD operations ===
class ReportBase(BaseModel):
    farm_id: int
    control_point_id: int
    date: date
    gram: int = Field(..., gt=0, description="Weight in grams (must be positive)")


class ReportCreate(ReportBase):
    pass


class Report(ReportBase):
    id: int

    class Config:
        from_attributes = True


# === Schemas for statistics ===
class ReportStatistics(BaseModel):
    """Report statistics for a control point"""

    control_point_id: int
    control_point_name: str
    farm_id: int
    farm_name: str
    total_records: int
    average_weight: float
    std_deviation: float
    min_weight: int
    max_weight: int
    date_from: Optional[date] = None
    date_to: Optional[date] = None


class StatisticsRequest(BaseModel):
    """Statistics request with filters"""

    farm_ids: Optional[List[int]] = Field(None, description="List of farm IDs for filtering")
    control_point_ids: Optional[List[int]] = Field(None, description="List of control point IDs")
    date_from: Optional[date] = Field(None, description="Period start date")
    date_to: Optional[date] = Field(None, description="Period end date")


# === Schemas for report generation (charts) ===
class ChartData(BaseModel):
    """Chart data"""

    control_point_name: str
    days: List[int]
    values: List[float]


class ReportRequest(BaseModel):
    """Request for report generation with charts"""

    farm_ids: List[int]
    control_point_ids: List[int]
    indicator: str  # "средний вес" | "%" | "единобразие" | "стандартное отклонение"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ReportResponse(BaseModel):
    """Response with chart data"""

    charts: List[ChartData]
    overall_deviation: ChartData
