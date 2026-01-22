"""
Утилита для инициализации базы данных (async версия).

Используется для ручной инициализации БД или создания тестовых данных.
В основном приложении инициализация происходит автоматически в main.py.
"""
import asyncio
import logging
import random
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.camera import Camera
from app.models.control_point import ControlPoint
from app.models.farm import Farm
from app.models.growth_rate import GrowthRate
from app.models.report import Report
from app.models.user import User

logger = logging.getLogger(__name__)


async def init_test_data():
    """Инициализация тестовых данных (фермы, точки контроля, камеры и т.д.)"""
    async with AsyncSessionLocal() as db:
        try:
            # Проверяем, есть ли уже фермы
            result = await db.execute(select(Farm))
            farms = result.scalars().all()
            
            if len(farms) > 1:
                logger.info(f"Тестовые данные уже существуют ({len(farms)} ферм). Пропуск создания.")
                return
            
            logger.info("Создание тестовых данных...")
            farms_data = [{"name": "Ферма №1"}, {"name": "Ферма №2"}, {"name": "Ферма №3"}]
            
            total_reports = 0

            for farm_data in farms_data:
                farm = Farm(**farm_data)
                db.add(farm)
                await db.flush()

                # Добавляем точки контроля для каждой фермы (3 корпуса на ферму)
                for i in range(1, 4):
                    # Добавляем точки контроля для каждого корпуса
                    for j in range(1, 3):
                        control_point = ControlPoint(
                            name=f"Точка {j}", frame_name=f"Корпус {i}", farm_id=farm.id
                        )
                        db.add(control_point)
                        await db.flush()

                        # Добавляем тестовые камеры к точкам контроля
                        for k in range(1, 3):
                            camera = Camera(
                                name=f"Камера {k}",
                                url=f"http://example.com/stream/{farm.id}/{i}/{j}/{k}",
                                farm_id=farm.id,
                                control_point_id=control_point.id,
                            )
                            db.add(camera)

                        # Добавляем тестовые данные норм развития
                        landing_date = date.today() - timedelta(days=15)
                        initial_weight = 45 + (j * 5)
                        
                        # Создаем уникальный seed для каждой точки контроля для воспроизводимости
                        random.seed(farm.id * 100 + i * 10 + j)
                        
                        growth_rate = GrowthRate(
                            farm_id=farm.id,
                            control_point_id=control_point.id,
                            chickens_quantity=5000 + (j * 100),
                            growth_day=15 + j,
                            initial_average_weight=initial_weight,
                            landing_date=landing_date,
                            closing_date=None,
                        )
                        db.add(growth_rate)

                        # Генерируем отчеты на разные даты с вариативностью весов
                        # Создаем отчеты примерно каждые 2-3 дня
                        reports_data = []
                        
                        # Отчет на дату посадки (начальный вес)
                        reports_data.append({
                            'date': landing_date,
                            'gram': initial_weight
                        })
                        
                        # Генерируем отчеты на промежуточные дни
                        days_since_landing = 0
                        target_weight = 1200 + (j * 50) + random.randint(-30, 30)  # Целевой вес с вариацией
                        
                        # Создаем отчеты каждые 2-3 дня
                        while days_since_landing < 15:
                            days_since_landing += random.randint(2, 3)
                            if days_since_landing >= 15:
                                days_since_landing = 15
                            
                            report_date = landing_date + timedelta(days=days_since_landing)
                            
                            # Вычисляем вес с учетом роста и вариативности
                            # Рост примерно линейный с небольшими отклонениями
                            progress = days_since_landing / 15.0
                            base_weight = initial_weight + (target_weight - initial_weight) * progress
                            
                            # Добавляем случайное отклонение (±3-5% для реалистичности)
                            variation = random.uniform(-0.05, 0.05)
                            weight = int(base_weight * (1 + variation))
                            
                            # Ограничиваем минимальный и максимальный вес
                            min_weight = initial_weight
                            max_weight = target_weight + 50
                            weight = max(min_weight, min(max_weight, weight))
                            
                            reports_data.append({
                                'date': report_date,
                                'gram': weight
                            })
                        
                        # Создаем отчеты в базе данных
                        for report_data in reports_data:
                            report = Report(
                                farm_id=farm.id,
                                control_point_id=control_point.id,
                                date=report_data['date'],
                                gram=report_data['gram'],
                            )
                            db.add(report)
                            total_reports += 1

            await db.commit()
            
            logger.info(
                f"Тестовые данные успешно созданы: "
                f"{len(farms_data)} ферм, 18 точек контроля, 36 камер, 18 норм развития и "
                f"{total_reports} отчетов с вариативными весами и датами"
            )

        except Exception as e:
            logger.error(f"Ошибка при создании тестовых данных: {e}", exc_info=True)
            await db.rollback()
            raise


async def init_db():
    """Инициализация базы данных с тестовыми данными (для ручного запуска)"""
    # Создаем таблицы
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Создаем тестовые данные
    await init_test_data()


if __name__ == "__main__":
    asyncio.run(init_db())
