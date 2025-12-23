from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class ReportRequest(BaseModel):
    """Schema for report generation request"""

    farm_ids: List[int]
    control_point_ids: List[int]
    indicator: str  # "средний вес" | "%" | "единобразие" | "стандартное отклонение"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ChartData(BaseModel):
    """Schema for chart data in report response"""

    control_point_name: str
    days: List[int]
    values: List[float]


class ReportResponse(BaseModel):
    """Schema for report generation response"""

    charts: List[ChartData]
    overall_deviation: ChartData
