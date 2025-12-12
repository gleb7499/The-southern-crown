from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.report import ReportRequest, ReportResponse, ChartData
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/generate", response_model=ReportResponse)
def generate_report(
    report_request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Stub implementation - returns fake chart data
    charts = []
    
    for i, cp_id in enumerate(report_request.control_point_ids[:3]):
        charts.append(ChartData(
            control_point_name=f"Точка контроля {cp_id}",
            days=list(range(1, 31)),
            values=[100 + i * 10 + j * 0.5 for j in range(30)]
        ))
    
    overall_deviation = ChartData(
        control_point_name="Общее отклонение",
        days=list(range(1, 31)),
        values=[5 + j * 0.1 for j in range(30)]
    )
    
    return ReportResponse(
        charts=charts,
        overall_deviation=overall_deviation
    )


@router.get("/alert")
def get_alert(
    current_user: User = Depends(get_current_user)
):
    return {
        "status": "critical",
        "message": "Критическое снижение массы"
    }
