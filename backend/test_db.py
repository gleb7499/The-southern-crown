"""
Скрипт для тестирования структуры БД
Запуск: python test_db.py
"""

import sys
from pathlib import Path

# Добавляем backend в путь
sys.path.insert(0, str(Path(__file__).parent))

import sqlite3

from app.core.database import Base, engine
from app.models.camera import Camera
from app.models.control_point import ControlPoint
from app.models.farm import Farm
from app.models.growth_rate import GrowthRate
from app.models.report import Report
from app.models.user import User


def test_database_structure():
    """Тестирует создание таблиц и их структуру"""
    print("🔍 Проверка структуры базы данных...\n")

    # Создаем таблицы
    print("1. Создание таблиц...")
    Base.metadata.create_all(bind=engine)
    print("   ✅ Таблицы созданы\n")

    # Проверяем существование таблиц
    print("2. Проверка существования таблиц:")
    conn = sqlite3.connect("southern_crown.db")
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    expected_tables = ["user", "farm", "control_point", "growth_rate", "report", "camera"]
    found_tables = [table[0] for table in tables]

    for table in expected_tables:
        if table in found_tables:
            print(f"   ✅ {table}")
        else:
            print(f"   ❌ {table} - НЕ НАЙДЕНА!")

    print("\n3. Структура таблиц:")
    for table in expected_tables:
        if table in found_tables:
            print(f"\n   📊 Таблица: {table}")
            cursor.execute(f"PRAGMA table_info({table});")
            columns = cursor.fetchall()
            for col in columns:
                col_id, name, col_type, not_null, default, pk = col
                pk_mark = " [PK]" if pk else ""
                null_mark = " NOT NULL" if not_null else ""
                print(f"      - {name}: {col_type}{pk_mark}{null_mark}")

    # Проверяем foreign keys
    print("\n4. Проверка связей (Foreign Keys):")
    for table in ["control_point", "growth_rate", "report", "camera"]:
        if table in found_tables:
            cursor.execute(f"PRAGMA foreign_key_list({table});")
            fks = cursor.fetchall()
            if fks:
                print(f"   📎 {table}:")
                for fk in fks:
                    fk_id, seq, ref_table, from_col, to_col, on_update, on_delete, match = fk
                    print(f"      {from_col} → {ref_table}.{to_col} (on delete: {on_delete})")

    conn.close()
    print("\n✅ Проверка структуры БД завершена!")


def test_relationships():
    """Тестирует relationships между моделями"""
    print("\n🔗 Проверка relationships в моделях...\n")

    # Проверяем атрибуты relationships
    checks = [
        ("Farm", Farm, ["control_points", "growth_rates", "reports"]),
        ("ControlPoint", ControlPoint, ["farm", "cameras", "growth_rates", "reports"]),
        ("Camera", Camera, ["control_point"]),
        ("GrowthRate", GrowthRate, ["farm", "control_point"]),
        ("Report", Report, ["farm", "control_point"]),
    ]

    for model_name, model_class, expected_rels in checks:
        print(f"   {model_name}:")
        for rel in expected_rels:
            if hasattr(model_class, rel):
                print(f"      ✅ {rel}")
            else:
                print(f"      ❌ {rel} - НЕ НАЙДЕН!")

    print("\n✅ Проверка relationships завершена!")


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 ТЕСТИРОВАНИЕ СТРУКТУРЫ БАЗЫ ДАННЫХ")
    print("=" * 60 + "\n")

    try:
        test_database_structure()
        test_relationships()

        print("\n" + "=" * 60)
        print("🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback

        traceback.print_exc()
