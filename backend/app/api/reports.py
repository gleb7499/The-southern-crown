import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.control_point import ControlPoint
from app.models.farm import Farm
from app.models.report import Report as ReportModel
from app.models.user import User
from app.schemas.report_schemas import (
    ChartData,
    Report,
    ReportCreate,
    ReportRequest,
    ReportResponse,
    ReportStatistics,
    StatisticsRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# === CRUD operations for Report ===


@router.post("/", response_model=Report, status_code=201)
async def create_report(
    report: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new report record with weight for a control point.

    - **farm_id**: Farm ID
    - **control_point_id**: Control point ID
    - **date**: Measurement date
    - **gram**: Weight in grams (positive number)
    """
    # Check that the farm exists
    farm_result = await db.execute(select(Farm).filter(Farm.id == report.farm_id))
    farm = farm_result.scalar_one_or_none()
    if not farm:
        logger.error(f"Farm not found: {report.farm_id}")
        raise HTTPException(status_code=404, detail=f"Farm with id {report.farm_id} not found")

    # Check that the control point exists
    cp_result = await db.execute(
        select(ControlPoint).filter(ControlPoint.id == report.control_point_id)
    )
    control_point = cp_result.scalar_one_or_none()
    if not control_point:
        logger.error(f"Control point not found: {report.control_point_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Control point with id {report.control_point_id} not found",
        )

    # Check that the control point belongs to the specified farm
    if control_point.farm_id != report.farm_id:  # type: ignore
        logger.error(
            f"Control point {report.control_point_id} does not belong to farm {report.farm_id}"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Control point {report.control_point_id} does not belong to farm {report.farm_id}",
        )

    # Create the record
    db_report = ReportModel(**report.model_dump())
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)

    logger.info(
        f"Created report: id={db_report.id}, farm={report.farm_id}, cp={report.control_point_id}, date={report.date}"
    )
    return db_report


@router.get("/", response_model=List[Report])
async def get_reports(
    farm_id: Optional[int] = Query(None, description="Filter by farm ID"),
    control_point_id: Optional[int] = Query(None, description="Filter by control point ID"),
    date_from: Optional[date] = Query(None, description="Period start date"),
    date_to: Optional[date] = Query(None, description="Period end date"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the list of reports with filtering.

    Filters:
    - **farm_id**: Farm ID
    - **control_point_id**: Control point ID
    - **date_from/date_to**: Date range
    """
    query = select(ReportModel)

    if farm_id:
        query = query.where(ReportModel.farm_id == farm_id)

    if control_point_id:
        query = query.where(ReportModel.control_point_id == control_point_id)

    if date_from:
        query = query.where(ReportModel.date >= date_from)

    if date_to:
        query = query.where(ReportModel.date <= date_to)

    query = query.order_by(ReportModel.date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()

    logger.info(f"Retrieved {len(reports)} reports with filters")
    return reports


# === Statistics and analytics ===


@router.post("/statistics", response_model=List[ReportStatistics])
async def get_statistics(
    filters: StatisticsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get report statistics: average, standard deviation, min/max.

    Grouped by control points.
    Filters:
    - **farm_ids**: List of farm IDs
    - **control_point_ids**: List of control point IDs
    - **date_from/date_to**: Date range
    """
    # Base query with grouping
    query = (
        select(
            ReportModel.control_point_id,
            ControlPoint.name.label("control_point_name"),
            ReportModel.farm_id,
            Farm.name.label("farm_name"),
            func.count(ReportModel.id).label("total_records"),
            func.avg(ReportModel.gram).label("average_weight"),
            func.min(ReportModel.gram).label("min_weight"),
            func.max(ReportModel.gram).label("max_weight"),
        )
        .select_from(ReportModel)
        .join(ControlPoint, ReportModel.control_point_id == ControlPoint.id)
        .join(Farm, ReportModel.farm_id == Farm.id)
    )

    # Apply filters
    if filters.farm_ids:
        query = query.where(ReportModel.farm_id.in_(filters.farm_ids))

    if filters.control_point_ids:
        query = query.where(ReportModel.control_point_id.in_(filters.control_point_ids))

    if filters.date_from:
        query = query.where(ReportModel.date >= filters.date_from)

    if filters.date_to:
        query = query.where(ReportModel.date <= filters.date_to)

    # Grouping
    query = query.group_by(
        ReportModel.control_point_id,
        ControlPoint.name,
        ReportModel.farm_id,
        Farm.name,
    )

    result = await db.execute(query)
    results = result.all()

    # Calculate the standard deviation for each group
    statistics = []
    for row in results:
        # Get all gram values for this control point
        values_query = select(ReportModel.gram).where(
            ReportModel.control_point_id == row.control_point_id,
            ReportModel.farm_id == row.farm_id,
        )

        if filters.date_from:
            values_query = values_query.where(ReportModel.date >= filters.date_from)
        if filters.date_to:
            values_query = values_query.where(ReportModel.date <= filters.date_to)

        values_result = await db.execute(values_query)
        values = [v[0] for v in values_result.all()]

        # Calculate the standard deviation
        if len(values) > 1:
            mean = sum(values) / len(values)
            variance = sum((x - mean) ** 2 for x in values) / len(values)
            std_dev = variance**0.5
        else:
            std_dev = 0.0

        statistics.append(
            ReportStatistics(
                control_point_id=row.control_point_id,
                control_point_name=row.control_point_name,
                farm_id=row.farm_id,
                farm_name=row.farm_name,
                total_records=row.total_records,
                average_weight=round(row.average_weight, 2),
                std_deviation=round(std_dev, 2),
                min_weight=row.min_weight,
                max_weight=row.max_weight,
                date_from=filters.date_from,
                date_to=filters.date_to,
            )
        )

    logger.info(f"Calculated statistics for {len(statistics)} control points")
    return statistics


# === Report generation with charts (old functionality, improved) ===


@router.post("/generate", response_model=ReportResponse)
async def generate_report(  # noqa: C901
    report_request: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a report with charts for visualization.

    Builds day-based charts from real database data.
    """
    charts = []

    for cp_id in report_request.control_point_ids:
        # Get the control point
        cp_result = await db.execute(select(ControlPoint).filter(ControlPoint.id == cp_id))
        control_point = cp_result.scalar_one_or_none()

        if not control_point:
            logger.warning(f"Control point {cp_id} not found, skipping")
            continue

        # Get report data
        query = select(ReportModel).where(ReportModel.control_point_id == cp_id)

        if report_request.start_date:
            query = query.where(ReportModel.date >= report_request.start_date)

        if report_request.end_date:
            query = query.where(ReportModel.date <= report_request.end_date)

        query = query.order_by(ReportModel.date)
        result = await db.execute(query)
        reports = result.scalars().all()

        if not reports:
            logger.warning(f"No data for control point {cp_id}")
            continue

        # Build the chart data
        if report_request.indicator == "средний вес":
            # Group by day and compute the average
            days = []
            values = []
            for idx, report in enumerate(reports):
                day_num = (report.date - reports[0].date).days + 1
                days.append(day_num)
                values.append(float(int(report.gram)))  # type: ignore

            charts.append(
                ChartData(
                    control_point_name=f"{control_point.name} ({control_point.frame_name})",
                    days=days,
                    values=values,
                )
            )

    # Calculate the overall deviation across all points
    if charts:
        all_values = []
        for chart in charts:
            all_values.extend(chart.values)

        if len(all_values) > 1:
            mean = sum(all_values) / len(all_values)
            deviations = [(x - mean) for x in all_values]
            overall_deviation = ChartData(
                control_point_name="Общее отклонение от среднего",
                days=list(range(1, len(deviations) + 1)),
                values=deviations,
            )
        else:
            overall_deviation = ChartData(
                control_point_name="Общее отклонение", days=[1], values=[0]
            )
    else:
        overall_deviation = ChartData(control_point_name="Нет данных", days=[], values=[])

    return ReportResponse(charts=charts, overall_deviation=overall_deviation)
