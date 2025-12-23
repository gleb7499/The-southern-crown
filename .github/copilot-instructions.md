# The Southern Crown - Инструкции для AI программирования

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Принципы разработки

**Безопасность и архитектурная грамотность - это НЕ дополнение, а ОСНОВА всего кода!**

### Обязательные принципы (не опциональные!)

1. **Валидация на всех уровнях**:
   - Backend: Pydantic схемы с Field validators + бизнес-логика в endpoints
   - Всегда проверяйте FK перед созданием связей
   - Валидируйте соответствие связанных сущностей (например, `control_point.farm_id == camera.farm_id`)

2. **Безопасность данных**:
   - Никогда не доверяйте входным данным - всегда валидируйте
   - Проверяйте права доступа (`current_user.is_admin` для административных операций)
   - Используйте `# type: ignore` только там, где SQLAlchemy требует, не для обхода проверок типов
   - Логируйте все критические операции и ошибки

3. **Архитектурная чистота**:
   - Один файл - один класс/модель (Single Responsibility Principle)
   - Не дублируйте код - выносите общую логику в утилиты
   - Используйте dependency injection через FastAPI `Depends()`
   - Соблюдайте разделение слоёв: models → schemas → api

4. **Консистентность данных**:
   - Cascade delete для зависимых сущностей (`cascade="all, delete-orphan"`)
   - Транзакционность: используйте `db.commit()` только после всех проверок
   - При ошибке всегда делайте `db.rollback()` (FastAPI делает автоматически)
   - Проверяйте бизнес-правила (например, closing_date >= landing_date)

5. **Обработка ошибок**:
   - Возвращайте правильные HTTP коды: 201 (created), 404 (not found), 400 (validation), 403 (forbidden)
   - Всегда логируйте ошибки перед raise HTTPException
   - Сообщения об ошибках на русском, но без раскрытия внутренней логики

### Анти-паттерны (НИКОГДА не делайте так)

- ❌ Bearer token в заголовках (только cookies!)
- ❌ Создание сущностей без проверки FK
- ❌ Пропуск валидации "потому что данные уже проверены на фронтенде"
- ❌ `# type: ignore` для обхода реальных проблем с типами
- ❌ Дублирование кода вместо создания переиспользуемых функций
- ❌ Изменение БД без пересоздания и тестирования

## Обзор проекта

Административная панель управления фермой с FastAPI бэкендом и React фронтендом. Управляет упрощённой иерархической структурой: **Ферма → Точка контроля (с frame_name) → Камера**. Русский язык для UI/документации, английский для кода.

## Архитектура

### Backend (FastAPI + SQLAlchemy + SQLite)

- **Точка входа**: [backend/app/main.py](backend/app/main.py) - инициализирует FastAPI, создаёт таблицы БД при запуске
- **Модели базы данных** в [backend/app/models/](backend/app/models/): `Farm`, `ControlPoint`, `Camera`, `GrowthRate`, `Report`, `User`
  - **ВАЖНО**: Таблица `Building` удалена! Вместо неё используется поле `frame_name` в `ControlPoint`
  - Все таблицы в единственном числе: `farm`, `control_point`, `camera`, `growth_rate`, `report`
- **Схемы** в [backend/app/schemas/](backend/app/schemas/): Pydantic модели с валидацией
  - Один файл на сущность: `farm_schema.py`, `control_point.py`, `camera.py`, `growth_rate.py`, `report_schemas.py`
- **API маршруты** в [backend/app/api/](backend/app/api/): `auth`, `farms`, `control_points`, `cameras`, `growth_rates`, `reports`
- **Аутентификация**: JWT токены **только через cookies** (см. [backend/app/api/deps.py](backend/app/api/deps.py))
  - `get_current_user` зависимость читает токен из `access_token` cookie
  - httponly, samesite=lax, срок действия 24h
  - **Никогда не используйте Bearer token заголовки** - только cookies!

### Frontend (React 18 + Vite + React Router)

- **Страницы** в [frontend/src/pages/](frontend/src/pages/): `Login`, `General`, `Reports`, `Settings`
- **API клиент** в [frontend/src/services/api.js](frontend/src/services/api.js):
  - Axios с `withCredentials: true` для аутентификации на основе cookies
  - Глобальный 401 перехватчик перенаправляет на `/login`
  - Пустой `baseURL` - опирается на Vite прокси в разработке
- **Маршрутизация**: Все страницы dashboard используют префикс `/dashboard/*`
- **Управление состоянием**: Локальное состояние компонента с `useState` - нет Redux/Context

## Схема базы данных (ОБНОВЛЕНО!)

```
Ферма (1) → (N) Точка контроля → (N) Камера
       ↓              ↓
   (N) GrowthRate  (N) Report
```

**Ключевые изменения от старой схемы:**

- ❌ **Таблица `Building` удалена** - теперь `ControlPoint.frame_name` (String) хранит название корпуса инлайн
- ✅ **Camera теперь связана напрямую с Farm** через `farm_id` (в дополнение к `control_point_id`)
- ✅ Добавлены таблицы `GrowthRate` и `Report` для отслеживания норм развития и ежедневных измерений

**Relationships** в [backend/app/models/farm.py](backend/app/models/farm.py):

- `Farm` имеет: `control_points`, `cameras`, `growth_rates`, `reports` (все с cascade delete)
- `ControlPoint` имеет: `farm_id`, `frame_name` (вместо building_id), `cameras`, `growth_rates`, `reports`
- `Camera` имеет: **оба** `farm_id` и `control_point_id` (валидируется их соответствие в API)

## Рабочие процессы разработки

### Запуск всего стека

```bash
docker compose up --build
```

- Backend: <http://localhost:8000> (API документация в `/docs`)
- Frontend: <http://localhost:5173>
- Вход по умолчанию: `admin@example.com` / `admin123`

### Только Backend (Python)

```bash
cd backend
pip install -r requirements.txt
python -m app.init_db  # Создаёт БД и seed данные
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Только Frontend (Node.js)

```bash
cd frontend
npm install
npm run dev
```

### Инициализация базы данных

[backend/app/init_db.py](backend/app/init_db.py) создаёт seed данные:

- Администратор (email: <admin@example.com>, password: admin123)
- 3 фермы → каждая с 3 frame_name ("Корпус 1", "Корпус 2", "Корпус 3")
- Каждый frame имеет 2 точки контроля → каждая с 2 камерами, growth_rate и report
- **Важно**: Камеры создаются с обязательным `farm_id` (новое требование)
- Запуск: `python -m app.init_db` или автоматически при `docker compose up`

### Работа с Python окружением

- **Виртуальное окружение**: `.venv` в корне проекта
- Путь к Python: `C:/Users/kseni/Documents/Фриланс/The-southern-crown/.venv/Scripts/python.exe`
- Для команд используйте полный путь: `C:/.../python.exe -m black app/`
- Линтеры установлены в venv: `black`, `isort`, `flake8`

## Ключевые соглашения

### Паттерны Backend (архитектурные требования)

1. **Внедрение зависимостей**: `Depends(get_db)` для БД, `Depends(get_current_user)` для аутентификации
2. **Один файл - один класс**: Каждая модель/схема в отдельном файле (см. models/ и schemas/)
3. **Валидация связей** (ОБЯЗАТЕЛЬНО при создании):
   - Проверяйте существование всех FK (farm_id, control_point_id)
   - Валидируйте соответствие связей между сущностями
   - Пример правильной реализации: [backend/app/api/cameras.py](backend/app/api/cameras.py#L50-L77)

   ```python
   # Плохо - создание без проверок
   db_camera = CameraModel(**camera.dict())
   
   # Хорошо - с полной валидацией
   farm = db.query(Farm).filter(Farm.id == camera.farm_id).first()
   if not farm:
       raise HTTPException(status_code=404, detail=f"Farm {camera.farm_id} not found")
   
   control_point = db.query(ControlPoint).filter(ControlPoint.id == camera.control_point_id).first()
   if not control_point:
       raise HTTPException(status_code=404, detail=f"Control point not found")
   
   if control_point.farm_id != camera.farm_id:  # type: ignore
       raise HTTPException(status_code=400, detail="Control point does not belong to farm")
   ```

4. **Docstrings на русском**: Все docstrings для Swagger UI **обязательно на русском языке**
5. **HTTP коды**: 201 для создания, 404 для не найденных, 400 для валидационных ошибок, 403 для forbidden
6. **Логирование**: `logger.info()` для успешных операций, `logger.error()` перед raise HTTPException
7. **Type hints + Type safety**: Всегда аннотации типов; `# type: ignore` только для SQLAlchemy Column операций

### Паттерны Frontend

1. **Структура компонента**: Модальные окна в `components/`, страницы потребляют их напрямую
2. **API вызовы**: Деструктурируйте из доменно-специфичных API объектов (`farmsAPI`, `controlPointsAPI`)
3. **Обработка ошибок**: Позвольте глобальному axios перехватчику обрабатывать 401s; показывайте ошибки через локальное состояние
4. **Отправка формы**: Контролируемые компоненты с `useState` для данных формы
5. **Стилизация**: Единственный CSS файл в [frontend/src/styles/App.css](frontend/src/styles/App.css) - нет CSS модулей

### Стиль кода и линтинг

- **Backend**: Python с type hints, форматирование через `black --line-length 100`
- **Frontend**: Функциональные компоненты с hooks; нет class компонентов
- **Названия**: Русский в UI/docstrings, английский в коде
- **Импорты**: Абсолютные с префиксом `app.`, сортировка через `isort`
- **Pre-commit hooks**: Автоматический запуск black/isort/flake8 перед коммитом
  - **НИКОГДА не используйте `--no-verify`!** Всегда исправляйте ошибки линтера
  - При проблемах: запустите вручную `python -m black .`, `python -m isort .`
- **Flake8**: Игнорируем E501 (длинные строки), C901 (сложность), W503 (переносы)

## Критические точки интеграции

### Конфигурация CORS

[backend/app/main.py](backend/app/main.py#L9-L15): Позволяет `localhost:5173` и `localhost:3000`. Обновите при изменении портов.

### Разрешение API URL

Frontend использует пустой `baseURL` в конфиге axios - полагается на:

- Docker: Оба сервиса в одной `app-network`, frontend прокси на `backend:8000`
- Локальная разработка: Настройте Vite proxy или используйте полные URLs

### Сохранение базы данных

Расположение файла SQLite:

- Docker: `/app/data/southern_crown.db` (volume монтирован как `backend-data`)
- Локальная: `backend/data/southern_crown.db`

## Типичные задачи

**Добавить новый CRUD endpoint** (строго следуйте этому порядку):

1. **Модель** в `backend/app/models/<name>.py`:
   - Один класс на файл
   - Индексы для FK полей
   - Правильные relationship с `back_populates` и `cascade`
2. **Схемы** в `backend/app/schemas/<name>.py`:
   - Base (общие поля), Create (для создания), Update (Optional поля), Response (с id)
   - Field validators с описаниями на русском
   - Проверка бизнес-логики (например, `gt=0` для положительных чисел)
3. **Роутер** в `backend/app/api/<name>s.py`:
   - GET (list) с фильтрацией и пагинацией
   - GET/{id} с проверкой существования
   - POST с **обязательной валидацией всех FK** и бизнес-правил
   - PUT с проверкой существования и валидацией обновлений
   - DELETE с проверкой существования
   - Эталон: [backend/app/api/growth_rates.py](backend/app/api/growth_rates.py)
4. **Регистрация** в [backend/app/main.py](backend/app/main.py):
   - `app.include_router(<name>s.router, prefix="/api/<name>s", tags=["<name>s"])`
5. **Тестирование**:
   - Пересоздайте БД: `rm backend/data/southern_crown.db && python -m app.init_db`
   - Проверьте через Swagger UI `/docs`
   - Протестируйте все случаи: успех, не найдено, невалидные данные

**Изменить схему БД** (только с полным пересозданием!):

1. **Планирование**: Подумайте о последствиях - какие связи затронуты?
2. **Обновите модель** в `backend/app/models/`:
   - Добавьте индексы для новых FK
   - Настройте relationship с правильным cascade
   - Проверьте двусторонние связи (back_populates)
3. **Обновите схемы** в `backend/app/schemas/`:
   - Добавьте валидаторы для новых полей
   - Обновите Update схемы (все поля Optional)
4. **Обновите API** endpoints:
   - Добавьте валидацию новых FK
   - Обновите логику создания/обновления
5. **Пересоздайте БД** (ALEMBIC НЕ НАСТРОЕН):

   ```bash
   rm backend/data/southern_crown.db  # или data/southern_crown.db в Docker
   python -m app.init_db  # или docker compose restart backend
   ```

6. **Тестирование**:
   - Проверьте создание всех сущностей
   - Проверьте cascade delete
   - Проверьте валидацию связей

**Коммит изменений** (качество кода обязательно!):

1. **Запустите линтеры** (из backend/):

   ```bash
   python -m black . --line-length 100
   python -m isort .
   python -m flake8 . --max-line-length=100 --extend-ignore=E501,C901,W503
   ```

2. **Проверьте ошибки**: Исправьте ВСЕ предупреждения, не игнорируйте их
3. **Проверьте типы**: Убедитесь что type hints корректны
4. **Git workflow**:

   ```bash
   git add .
   git commit -m "feat/fix/refactor: Описание изменений"
   # Pre-commit hooks запустятся автоматически
   # При ошибках - исправьте и повторите коммит
   git push
   ```

5. **ВАЖНО**: Если pre-commit hook падает - НЕ используйте `--no-verify`! Исправьте проблему.

**Добавить новую страницу**:

1. Создайте компонент в `frontend/src/pages/`
2. Добавьте маршрут в `frontend/src/App.jsx`
3. Добавьте ссылку в боковой панели в `frontend/src/components/Sidebar.jsx`
