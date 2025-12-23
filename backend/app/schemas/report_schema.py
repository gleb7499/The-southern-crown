from pydantic import BaseModel
from datetime import date


class ReportBase(BaseModel):
    farm_id: int
    control_point_id: int
    date: date
    gram: int


class ReportCreate(ReportBase):
    pass


class Report(ReportBase):
    id: int

    class Config:
        from_attributes = True
