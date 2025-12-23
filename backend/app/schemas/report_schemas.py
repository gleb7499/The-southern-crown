from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


# === Схемы для CRUD операций ===
class ReportBase(BaseModel):
    farm_id: int
    control_point_id: int
    date: date
    gram: int = Field(..., gt=0, description="Вес в граммах (должен быть положительным)")


class ReportCreate(ReportBase):
    pass


class Report(ReportBase):
    id: int

    class Config:
        from_attributes = True


# === Схемы для статистики ===
class ReportStatistics(BaseModel):
    """Статистика по отчетам для контрольной точки"""

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
    """Запрос статистики с фильтрами"""

    farm_ids: Optional[List[int]] = Field(None, description="Список ID ферм для фильтрации")
    control_point_ids: Optional[List[int]] = Field(None, description="Список ID точек контроля")
    date_from: Optional[date] = Field(None, description="Начальная дата периода")
    date_to: Optional[date] = Field(None, description="Конечная дата периода")


# === Схемы для генерации отчетов (графики) ===
class ChartData(BaseModel):
    """Данные для графика"""

    control_point_name: str
    days: List[int]
    values: List[float]


class ReportRequest(BaseModel):
    """Запрос на генерацию отчета с графиками"""

    farm_ids: List[int]
    control_point_ids: List[int]
    indicator: str  # "средний вес" | "%" | "единобразие" | "стандартное отклонение"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ReportResponse(BaseModel):
    """Ответ с данными для графиков"""

    charts: List[ChartData]
    overall_deviation: ChartData
