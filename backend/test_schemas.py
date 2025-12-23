"""
Скрипт для тестирования Pydantic схем
Запуск: python test_schemas.py
"""

import sys
from datetime import date
from pathlib import Path

# Добавляем backend в путь
sys.path.insert(0, str(Path(__file__).parent))

from app.schemas.auth import LoginRequest, UserResponse
from app.schemas.camera import Camera, CameraCreate
from app.schemas.control_point import ControlPoint, ControlPointCreate, ControlPointWithDetails
from app.schemas.farm_schema import Farm, FarmCreate
from app.schemas.growth_rate import GrowthRate, GrowthRateCreate
from app.schemas.report_schema import Report, ReportCreate


def test_schema(schema_name, schema_class, test_data):
    """Тестирует одну Pydantic схему"""
    print(f"   Testing {schema_name}...")
    try:
        instance = schema_class(**test_data)
        print(f"      ✅ {schema_name} валидация пройдена")
        print(f"         Данные: {instance.model_dump()}")
        return True
    except Exception as e:
        print(f"      ❌ {schema_name} ошибка: {e}")
        return False


def test_all_schemas():
    """Тестирует все Pydantic схемы"""
    print("🧪 Проверка Pydantic схем...\n")

    tests = [
        ("FarmCreate", FarmCreate, {"name": "Тестовая ферма"}),
        ("Farm", Farm, {"id": 1, "name": "Тестовая ферма"}),
        (
            "ControlPointCreate",
            ControlPointCreate,
            {"name": "Точка 1", "frame_name": "Корпус 1", "farm_id": 1},
        ),
        (
            "ControlPoint",
            ControlPoint,
            {"id": 1, "name": "Точка 1", "frame_name": "Корпус 1", "farm_id": 1},
        ),
        (
            "ControlPointWithDetails",
            ControlPointWithDetails,
            {
                "id": 1,
                "name": "Точка 1",
                "frame_name": "Корпус 1",
                "farm_id": 1,
                "farm_name": "Тестовая ферма",
            },
        ),
        (
            "GrowthRateCreate",
            GrowthRateCreate,
            {
                "farm_id": 1,
                "control_point_id": 1,
                "chickens_quantity": 5000,
                "growth_day": 15,
                "initial_average_weight": 45,
                "landing_date": date.today(),
                "closing_date": None,
            },
        ),
        (
            "ReportCreate",
            ReportCreate,
            {"farm_id": 1, "control_point_id": 1, "date": date.today(), "gram": 1250},
        ),
        (
            "CameraCreate",
            CameraCreate,
            {"name": "Камера 1", "url": "http://example.com/stream/1", "control_point_id": 1},
        ),
        ("LoginRequest", LoginRequest, {"email": "admin@example.com", "password": "admin123"}),
        ("UserResponse", UserResponse, {"id": 1, "email": "admin@example.com", "is_admin": True}),
    ]

    passed = 0
    failed = 0

    for test_name, schema, data in tests:
        if test_schema(test_name, schema, data):
            passed += 1
        else:
            failed += 1

    print(f"\n📊 Результаты: ✅ {passed} пройдено, ❌ {failed} провалено")
    return failed == 0


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 ТЕСТИРОВАНИЕ PYDANTIC СХЕМ")
    print("=" * 60 + "\n")

    try:
        success = test_all_schemas()

        print("\n" + "=" * 60)
        if success:
            print("🎉 ВСЕ СХЕМЫ ПРОШЛИ ВАЛИДАЦИЮ!")
        else:
            print("⚠️ НЕКОТОРЫЕ СХЕМЫ НЕ ПРОШЛИ ВАЛИДАЦИЮ")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ КРИТИЧЕСКАЯ ОШИБКА: {e}")
        import traceback

        traceback.print_exc()
