from datetime import date, timedelta
from pathlib import Path

from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models.camera import Camera
from app.models.control_point import ControlPoint
from app.models.farm import Farm
from app.models.growth_rate import GrowthRate
from app.models.report import Report
from app.models.user import User


def init_db():
    # Ensure data directory exists and is writable
    data_dir = Path("/app/data")
    data_dir.mkdir(parents=True, exist_ok=True)

    # Check if database file exists and remove it for clean start
    db_file = data_dir / "southern_crown.db"
    if db_file.exists():
        try:
            db_file.unlink()
            print("Removed old database file")
        except Exception as e:
            print(f"Warning: Could not remove old database: {e}")

    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if admin user exists
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                is_active=True,
                is_admin=True,
            )
            db.add(admin)
            print("Created admin user: admin@example.com / admin123")

        # Create sample farms
        if db.query(Farm).count() == 0:
            farms_data = [{"name": "Ферма №1"}, {"name": "Ферма №2"}, {"name": "Ферма №3"}]

            for farm_data in farms_data:
                farm = Farm(**farm_data)
                db.add(farm)
                db.flush()

                # Add control points to each farm (3 frames per farm)
                for i in range(1, 4):
                    # Add control points to each frame
                    for j in range(1, 3):
                        control_point = ControlPoint(
                            name=f"Точка {j}", frame_name=f"Корпус {i}", farm_id=farm.id
                        )
                        db.add(control_point)
                        db.flush()

                        # Add sample cameras to control points
                        for k in range(1, 3):
                            camera = Camera(
                                name=f"Камера {k}",
                                url=f"http://example.com/stream/{farm.id}/{i}/{j}/{k}",
                                farm_id=farm.id,
                                control_point_id=control_point.id,
                            )
                            db.add(camera)

                        # Add sample growth rate data
                        growth_rate = GrowthRate(
                            farm_id=farm.id,
                            control_point_id=control_point.id,
                            chickens_quantity=5000 + (j * 100),
                            growth_day=15 + j,
                            initial_average_weight=45 + (j * 5),
                            landing_date=date.today() - timedelta(days=15),
                            closing_date=None,
                        )
                        db.add(growth_rate)

                        # Add sample report data for multiple days (last 15 days)
                        base_gram = 1250 + (j * 50)
                        for day_offset in range(15, 0, -1):
                            report_date = date.today() - timedelta(days=day_offset)
                            # Incremental gram values for each day
                            gram_value = base_gram - (15 - day_offset) * 80
                            report = Report(
                                farm_id=farm.id,
                                control_point_id=control_point.id,
                                date=report_date,
                                gram=max(500, gram_value),  # Min 500g
                            )
                            db.add(report)

            print("Created sample farms, control points, cameras, growth rates, and reports")

        db.commit()
        print("Database initialized successfully")

    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
