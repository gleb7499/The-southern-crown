# 🧪 Гайд по тестированию изменений в монорепозитории

Пошаговое руководство по тестированию изменений БД и backend'а отдельно от фронтенда.

---

## 📋 Порядок тестирования (снизу вверх)

### 1️⃣ Проверка Python кода (статика)

```powershell
# Переходим в backend
cd c:\Users\kseni\Documents\Фриланс\The-southern-crown\backend

# Проверяем синтаксис всех файлов
python -m py_compile app/models/*.py
python -m py_compile app/schemas/*.py
python -m py_compile app/api/*.py
```

**Что проверяется**: Синтаксические ошибки, импорты, базовые типы  
**Если ОК**: Нет вывода или "Compiled X files"  
**Если ошибка**: Увидишь SyntaxError или ImportError

---

### 2️⃣ Тестирование структуры БД

```powershell
# Запускаем тест структуры БД
python test_db.py
```

**Что проверяется**:

- ✅ Создание всех таблиц (user, farm, control_point, growth_rate, report, camera)
- ✅ Правильность полей в каждой таблице
- ✅ Foreign keys и связи
- ✅ SQLAlchemy relationships

**Ожидаемый результат**:

```
🧪 ТЕСТИРОВАНИЕ СТРУКТУРЫ БАЗЫ ДАННЫХ
===================================================
✅ Все таблицы созданы
✅ Все relationships найдены
🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!
```

---

### 3️⃣ Тестирование Pydantic схем

```powershell
# Запускаем тест схем
python test_schemas.py
```

**Что проверяется**:

- ✅ Валидация всех Create схем
- ✅ Валидация всех Response схем
- ✅ Правильность типов полей
- ✅ Обязательные/опциональные поля

**Ожидаемый результат**:

```
🧪 ТЕСТИРОВАНИЕ PYDANTIC СХЕМ
===================================================
✅ 10 схем пройдено, ❌ 0 провалено
🎉 ВСЕ СХЕМЫ ПРОШЛИ ВАЛИДАЦИЮ!
```

---

### 4️⃣ Создание БД с тестовыми данными

```powershell
# Удаляем старую БД (если есть)
Remove-Item southern_crown.db -ErrorAction SilentlyContinue

# Создаем новую БД с seed данными
python -m app.init_db
```

**Что происходит**:

- Создаются все таблицы
- Создается admin пользователь (<admin@example.com> / admin123)
- Создаются 3 фермы с точками контроля, камерами, growth_rates, reports

**Ожидаемый результат**:

```
Created admin user: admin@example.com / admin123
Created sample farms, control points, cameras, growth rates, and reports
Database initialized successfully
```

---

### 5️⃣ Просмотр БД (опционально)

**Вариант A: Через Python**

```powershell
python
```

```python
import sqlite3
conn = sqlite3.connect('southern_crown.db')
cursor = conn.cursor()

# Смотрим все таблицы
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()

# Смотрим фермы
cursor.execute("SELECT * FROM farm").fetchall()

# Смотрим точки контроля
cursor.execute("SELECT * FROM control_point").fetchall()

conn.close()
exit()
```

**Вариант B: Установить DB Browser for SQLite**

- Скачать: <https://sqlitebrowser.org/>
- Открыть файл `southern_crown.db`
- Визуально посмотреть все таблицы и данные

---

### 6️⃣ Запуск backend сервера

```powershell
# Установить зависимости (если еще не установлены)
pip install -r requirements.txt

# Запустить сервер
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Ожидаемый результат**:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
```

---

### 7️⃣ Тестирование API через Swagger UI

1. **Открыть браузер**: <http://localhost:8000/docs>
2. **Залогиниться**:
   - Найти `POST /api/auth/login`
   - Нажать "Try it out"
   - Ввести:

     ```json
     {
       "email": "admin@example.com",
       "password": "admin123"
     }
     ```

   - Нажать "Execute"
   - Должен вернуться статус 200

3. **Проверить endpoints**:
   - `GET /api/farms` - получить список ферм
   - `GET /api/control-points/` - получить точки контроля
   - `GET /api/cameras/` - получить камеры

**Что тестируем**:

- ✅ Аутентификация работает
- ✅ API возвращает данные из БД
- ✅ Связи работают (farm → control_points)
- ✅ Pydantic валидация работает

---

### 8️⃣ Тестирование API через curl/PowerShell (альтернатива)

```powershell
# Логин
$response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"admin123"}' `
  -SessionVariable session

# Получить фермы
Invoke-RestMethod -Uri "http://localhost:8000/api/farms" `
  -Method GET `
  -WebSession $session

# Получить точки контроля
Invoke-RestMethod -Uri "http://localhost:8000/api/control-points/" `
  -Method GET `
  -WebSession $session
```

---

### 9️⃣ Запуск через Docker (полный стек)

```powershell
# Вернуться в корень проекта
cd c:\Users\kseni\Documents\Фриланс\The-southern-crown

# Остановить и удалить старые контейнеры
docker compose down -v

# Собрать и запустить
docker compose up --build
```

**Что запускается**:

- Backend на <http://localhost:8000>
- Frontend на <http://localhost:5173>

**Тестирование**:

1. Открыть <http://localhost:8000/docs> - проверить Swagger
2. Открыть <http://localhost:5173> - проверить фронтенд

---

## 🎯 Итоговый чеклист

- [ ] Python код компилируется без ошибок
- [ ] test_db.py проходит успешно
- [ ] test_schemas.py проходит успешно
- [ ] init_db.py создает БД без ошибок
- [ ] Backend сервер запускается
- [ ] Swagger UI показывает все endpoints
- [ ] Login работает через Swagger
- [ ] GET endpoints возвращают данные
- [ ] Docker compose запускается (опционально)
- [ ] Frontend подключается к backend (опционально)

---

## 🐛 Частые проблемы

### ModuleNotFoundError

```powershell
# Установить зависимости
pip install -r requirements.txt
```

### База данных заблокирована

```powershell
# Остановить все процессы Python
# Удалить файл БД
Remove-Item southern_crown.db
# Пересоздать
python -m app.init_db
```

### Порт 8000 занят

```powershell
# Найти процесс
netstat -ano | findstr :8000
# Убить процесс (замените PID)
taskkill /PID <номер_процесса> /F
```

---

## 💡 Советы

1. **Тестируй снизу вверх**: БД → Схемы → API → Фронтенд
2. **Не запускай фронтенд**, пока backend не работает
3. **Используй Swagger UI** - это самый быстрый способ проверить API
4. **Проверяй логи** - они покажут, где ошибка
5. **Делай коммиты** после каждого успешного этапа

---

**Автор**: AI Assistant  
**Дата**: 23 декабря 2025
