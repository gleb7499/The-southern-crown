# The Southern Crown - Инструкции для AI программирования

## Обзор проекта
Административная панель управления фермой с FastAPI бэкендом и React фронтендом. Управляет иерархической структурой: Ферма → Корпус → Точка контроля → Камера. Русский язык UI/документация.

## Архитектура

### Backend (FastAPI + SQLAlchemy + SQLite)
- **Точка входа**: [backend/app/main.py](backend/app/main.py) - инициализирует FastAPI приложение, создаёт таблицы БД при запуске
- **Модели базы данных** в [backend/app/models/](backend/app/models/): `Farm`, `Building`, `ControlPoint`, `Camera`, `User`
- **Схемы** в [backend/app/schemas/](backend/app/schemas/): Pydantic модели для валидации запросов/ответов
- **API маршруты** в [backend/app/api/](backend/app/api/): `auth`, `farms`, `control_points`, `cameras`, `reports`
- **Аутентификация**: JWT токены на основе cookies (см. [backend/app/api/deps.py](backend/app/api/deps.py#L7-L38))
  - Логика аутентификации использует `get_current_user` зависимость, которая читает токен из cookies
  - Токены хранятся в `access_token` cookie (httponly, samesite=lax, 24h срок действия)
  - Нет Bearer token заголовков - всегда используются cookies

### Frontend (React 18 + Vite + React Router)
- **Страницы** в [frontend/src/pages/](frontend/src/pages/): `Login`, `General`, `Reports`, `Settings`
- **API клиент** в [frontend/src/services/api.js](frontend/src/services/api.js):
  - Axios с `withCredentials: true` для аутентификации на основе cookies
  - Глобальный 401 перехватчик перенаправляет на `/login`
  - Пустой `baseURL` - опирается на Vite прокси в разработке
- **Маршрутизация**: Все страницы dashboard используют префикс `/dashboard/*`
- **Управление состоянием**: Локальное состояние компонента с `useState` - нет Redux/Context

## Схема базы данных
```
Ферма (1) → (N) Корпус (1) → (N) Точка контроля (1) → (N) Камера
Пользователь (отдельная таблица для аутентификации)
```
Ключевые отношения в [backend/app/models/farm.py](backend/app/models/farm.py):
- SQLAlchemy `relationship()` с двусторонним `back_populates`
- `ControlPoint` имеет поля отслеживания `day_of_development` и `average_deviation`

## Рабочие процессы разработки

### Запуск всего стека:
```bash
docker compose up --build
```
- Backend: http://localhost:8000 (API документация в `/docs`)
- Frontend: http://localhost:5173
- Вход по умолчанию: `admin@example.com` / `admin123`

### Только Backend (Python):
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
[backend/app/init_db.py](backend/app/init_db.py) создаёт:
- Администратора (email: admin@example.com, password: admin123)
- 3 примера ферм с корпусами, точками контроля и камерами
- Запустить явно с `python -m app.init_db` или автоматически через Dockerfile CMD

## Ключевые соглашения

### Паттерны Backend
1. **Внедрение зависимостей**: Используйте `Depends(get_db)` для сессий БД, `Depends(get_current_user)` для аутентификации
2. **Структура маршрутизатора**: Каждый домен имеет собственный маршрутизатор в папке `api/` с согласованным названием (множественные существительные)
3. **Модели ответов**: Всегда указывайте `response_model` в декораторах маршрутов для валидации Pydantic
4. **Фильтрация запросов**: API endpoints принимают ID через запятую (`?farm_ids=1,2,3`) распарсенные на сервере
5. **Конфигурация**: Централизована в [backend/app/core/config.py](backend/app/core/config.py) используя `pydantic-settings`

### Паттерны Frontend
1. **Структура компонента**: Модальные окна в `components/`, страницы потребляют их напрямую
2. **API вызовы**: Деструктурируйте из доменно-специфичных API объектов (`farmsAPI`, `controlPointsAPI`, и т.д.)
3. **Обработка ошибок**: Позвольте глобальному axios перехватчику обрабатывать 401s; показывайте ошибки через локальное состояние
4. **Отправка формы**: Контролируемые компоненты с `useState` для данных формы
5. **Стилизация**: Единственный CSS файл в [frontend/src/styles/App.css](frontend/src/styles/App.css) - нет CSS модулей/styled-components

### Стиль кода
- **Backend**: Python с type hints (например, `def get_me(current_user: User = Depends(...)`)
- **Frontend**: Функциональные компоненты с hooks; нет class компонентов
- **Названия**: Русский язык в UI строках/комментариях, английский в идентификаторах кода
- **Импорты**: Backend использует абсолютные импорты с префиксом `app.`

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
- Локальная: `./southern_crown.db` в backend директории

## Типичные задачи

**Добавить новый endpoint**:
1. Создайте маршрут в `backend/app/api/<domain>.py`
2. Добавьте Pydantic схемы в `backend/app/schemas/<domain>.py`
3. Добавьте API метод в `frontend/src/services/api.js` под соответствующий доменный объект

**Добавить новое поле модели**:
1. Обновите SQLAlchemy модель в `backend/app/models/`
2. Обновите Pydantic схемы в `backend/app/schemas/`
3. Удалите/пересоздайте БД или напишите миграцию (Alembic не настроен в настоящее время)

**Добавить новую страницу**:
1. Создайте компонент в `frontend/src/pages/`
2. Добавьте маршрут в `frontend/src/App.jsx`
3. Добавьте ссылку в боковой панели в `frontend/src/components/Sidebar.jsx`
