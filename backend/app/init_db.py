from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.farm import Farm, Building, ControlPoint
from app.models.camera import Camera


def init_db():
    import os
    from pathlib import Path
    
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
                is_admin=True
            )
            db.add(admin)
            print("Created admin user: admin@example.com / admin123")
        
        # Create sample farms
        if db.query(Farm).count() == 0:
            farms_data = [
                {"name": "Ферма №1"},
                {"name": "Ферма №2"},
                {"name": "Ферма №3"}
            ]
            
            for farm_data in farms_data:
                farm = Farm(**farm_data)
                db.add(farm)
                db.flush()
                
                # Add buildings to each farm
                for i in range(1, 4):
                    building = Building(
                        name=f"Корпус {i}",
                        farm_id=farm.id
                    )
                    db.add(building)
                    db.flush()
                    
                    # Add control points to each building
                    for j in range(1, 3):
                        control_point = ControlPoint(
                            name=f"Точка {j}",
                            building_id=building.id,
                            day_of_development=10 + j,
                            average_deviation=5 * j
                        )
                        db.add(control_point)
            
            print("Created sample farms, buildings, and control points")
        
        db.commit()
        print("Database initialized successfully")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
