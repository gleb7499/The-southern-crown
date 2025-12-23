import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

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


# === CRUD операции для Report ===


@router.post("/", response_model=Report, status_code=201)
def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Создать новую запись отчета с весом для контрольной точки.

    - **farm_id**: ID фермы
    - **control_point_id**: ID контрольной точки
    - **date**: Дата измерения
    - **gram**: Вес в граммах (положительное число)
    """
    # Проверка существования фермы
    farm = db.query(Farm).filter(Farm.id == report.farm_id).first()
    if not farm:
        logger.error(f"Farm not found: {report.farm_id}")
        raise HTTPException(status_code=404, detail=f"Farm with id {report.farm_id} not found")

    # Проверка существования контрольной точки
    control_point = (
        db.query(ControlPoint).filter(ControlPoint.id == report.control_point_id).first()
    )
    if not control_point:
        logger.error(f"Control point not found: {report.control_point_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Control point with id {report.control_point_id} not found",
        )

    # Проверка что контрольная точка принадлежит указанной ферме
    if control_point.farm_id != report.farm_id:  # type: ignore
        logger.error(
            f"Control point {report.control_point_id} does not belong to farm {report.farm_id}"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Control point {report.control_point_id} does not belong to farm {report.farm_id}",
        )

    # Создание записи
    db_report = ReportModel(**report.model_dump())
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    logger.info(
        f"Created report: id={db_report.id}, farm={report.farm_id}, cp={report.control_point_id}, date={report.date}"
    )
    return db_report


@router.get("/", response_model=List[Report])
def get_reports(
    farm_id: Optional[int] = Query(None, description="Фильтр по ID фермы"),
    control_point_id: Optional[int] = Query(None, description="Фильтр по ID контрольной точки"),
    date_from: Optional[date] = Query(None, description="Начальная дата периода"),
    date_to: Optional[date] = Query(None, description="Конечная дата периода"),
    skip: int = Query(0, ge=0, description="Пропустить записей"),
    limit: int = Query(100, ge=1, le=1000, description="Максимум записей"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить список отчетов с фильтрацией.

    Фильтры:
    - **farm_id**: ID фермы
    - **control_point_id**: ID контрольной точки
    - **date_from/date_to**: Диапазон дат
    """
    query = db.query(ReportModel)

    if farm_id:
        query = query.filter(ReportModel.farm_id == farm_id)

    if control_point_id:
        query = query.filter(ReportModel.control_point_id == control_point_id)

    if date_from:
        query = query.filter(ReportModel.date >= date_from)

    if date_to:
        query = query.filter(ReportModel.date <= date_to)

    query = query.order_by(ReportModel.date.desc())
    reports = query.offset(skip).limit(limit).all()

    logger.info(f"Retrieved {len(reports)} reports with filters")
    return reports


# === Статистика и аналитика ===


@router.post("/statistics", response_model=List[ReportStatistics])
def get_statistics(
    filters: StatisticsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить статистику по отчетам: среднее, стандартное отклонение, мин/макс.

    Группировка по контрольным точкам.
    Фильтры:
    - **farm_ids**: Список ID ферм
    - **control_point_ids**: Список ID контрольных точек
    - **date_from/date_to**: Диапазон дат
    """
    # Базовый запрос с группировкой
    query = (
        db.query(
            ReportModel.control_point_id,
            ControlPoint.name.label("control_point_name"),
            ReportModel.farm_id,
            Farm.name.label("farm_name"),
            func.count(ReportModel.id).label("total_records"),
            func.avg(ReportModel.gram).label("average_weight"),
            func.min(ReportModel.gram).label("min_weight"),
            func.max(ReportModel.gram).label("max_weight"),
            # Стандартное отклонение (SQLite не имеет встроенной функции, используем простую формулу)
        )
        .join(ControlPoint, ReportModel.control_point_id == ControlPoint.id)
        .join(Farm, ReportModel.farm_id == Farm.id)
    )

    # Применение фильтров
    if filters.farm_ids:
        query = query.filter(ReportModel.farm_id.in_(filters.farm_ids))

    if filters.control_point_ids:
        query = query.filter(ReportModel.control_point_id.in_(filters.control_point_ids))

    if filters.date_from:
        query = query.filter(ReportModel.date >= filters.date_from)

    if filters.date_to:
        query = query.filter(ReportModel.date <= filters.date_to)

    # Группировка
    query = query.group_by(
        ReportModel.control_point_id,
        ControlPoint.name,
        ReportModel.farm_id,
        Farm.name,
    )

    results = query.all()

    # Вычисление стандартного отклонения для каждой группы
    statistics = []
    for row in results:
        # Получаем все значения gram для этой контрольной точки
        values_query = db.query(ReportModel.gram).filter(
            ReportModel.control_point_id == row.control_point_id,
            ReportModel.farm_id == row.farm_id,
        )

        if filters.date_from:
            values_query = values_query.filter(ReportModel.date >= filters.date_from)
        if filters.date_to:
            values_query = values_query.filter(ReportModel.date <= filters.date_to)

        values = [v[0] for v in values_query.all()]

        # Вычисление стандартного отклонения
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


# === Генерация отчетов с графиками (старый функционал, улучшенный) ===


@router.post("/generate", response_model=ReportResponse)
def generate_report(
    report_request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Генерация отчета с графиками для визуализации.

    На основе реальных данных из БД строит графики по дням.
    """
    charts = []

    for cp_id in report_request.control_point_ids:
        # Получаем контрольную точку
        control_point = db.query(ControlPoint).filter(ControlPoint.id == cp_id).first()

        if not control_point:
            logger.warning(f"Control point {cp_id} not found, skipping")
            continue

        # Получаем данные отчетов
        query = db.query(ReportModel).filter(ReportModel.control_point_id == cp_id)

        if report_request.start_date:
            query = query.filter(ReportModel.date >= report_request.start_date)

        if report_request.end_date:
            query = query.filter(ReportModel.date <= report_request.end_date)

        reports = query.order_by(ReportModel.date).all()

        if not reports:
            logger.warning(f"No data for control point {cp_id}")
            continue

        # Формируем данные для графика
        if report_request.indicator == "средний вес":
            # Группируем по дням и вычисляем среднее
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

    # Вычисляем общее отклонение по всем точкам
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
