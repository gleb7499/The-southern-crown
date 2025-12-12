from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class ReportRequest(BaseModel):
    farm_ids: List[int]
    building_ids: List[int]
    control_point_ids: List[int]
    indicator: str  # "средний вес" | "%" | "единобразие" | "стандартное отклонение"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ChartData(BaseModel):
    control_point_name: str
    days: List[int]
    values: List[float]


class ReportResponse(BaseModel):
    charts: List[ChartData]
    overall_deviation: ChartData
