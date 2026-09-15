"""
Utility for database initialization (async version).

Used for manual database initialization or creating test data.
In the main application, initialization happens automatically in main.py.
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
    """Initialize test data (farms, control points, cameras, etc.)"""
    async with AsyncSessionLocal() as db:
        try:
            # Check if farms already exist
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

                # Add control points for each farm (3 buildings per farm)
                for i in range(1, 4):
                    # Add control points for each building
                    for j in range(1, 3):
                        control_point = ControlPoint(
                            name=f"Точка {j}", frame_name=f"Корпус {i}", farm_id=farm.id
                        )
                        db.add(control_point)
                        await db.flush()

                        # Add test cameras to the control points
                        for k in range(1, 3):
                            camera = Camera(
                                name=f"Камера {k}",
                                url=f"http://example.com/stream/{farm.id}/{i}/{j}/{k}",
                                farm_id=farm.id,
                                control_point_id=control_point.id,
                            )
                            db.add(camera)

                        # Add test growth rate data
                        landing_date = date.today() - timedelta(days=15)
                        initial_weight = 45 + (j * 5)
                        
                        # Create a unique seed for each control point for reproducibility
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

                        # Generate reports on different dates with weight variability
                        # Create reports roughly every 2-3 days
                        reports_data = []
                        
                        # Report on the landing date (initial weight)
                        reports_data.append({
                            'date': landing_date,
                            'gram': initial_weight
                        })
                        
                        # Generate reports for intermediate days
                        days_since_landing = 0
                        target_weight = 1200 + (j * 50) + random.randint(-30, 30)  # Target weight with variation
                        
                        # Create reports every 2-3 days
                        while days_since_landing < 15:
                            days_since_landing += random.randint(2, 3)
                            if days_since_landing >= 15:
                                days_since_landing = 15
                            
                            report_date = landing_date + timedelta(days=days_since_landing)
                            
                            # Calculate the weight accounting for growth and variability
                            # Growth is roughly linear with small deviations
                            progress = days_since_landing / 15.0
                            base_weight = initial_weight + (target_weight - initial_weight) * progress
                            
                            # Add random deviation (±3-5% for realism)
                            variation = random.uniform(-0.05, 0.05)
                            weight = int(base_weight * (1 + variation))
                            
                            # Clamp the minimum and maximum weight
                            min_weight = initial_weight
                            max_weight = target_weight + 50
                            weight = max(min_weight, min(max_weight, weight))
                            
                            reports_data.append({
                                'date': report_date,
                                'gram': weight
                            })
                        
                        # Create the reports in the database
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
    """Initialize the database with test data (for manual runs)"""
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test data
    await init_test_data()


if __name__ == "__main__":
    asyncio.run(init_db())
