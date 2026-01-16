# The Southern Crown - Административная панель

Административная панель с FastAPI бэкендом и React фронтендом для управления фермами, корпусами, точками контроля и камерами.

## Технологический стек

### Backend

- **FastAPI** - современный веб-фреймворк для Python
- **SQLAlchemy** - ORM для работы с базой данных
- **SQLite** - база данных (легко заменяется на PostgreSQL)
- **JWT** - аутентификация через токены
- **Pydantic** - валидация данных

### Frontend

- **React 18** - UI библиотека
- **Vite** - сборщик и dev-сервер
- **React Router** - маршрутизация
- **Axios** - HTTP клиент

### Инфраструктура

- **Docker & Docker Compose** - контейнеризация
- **Nginx** - опционально для продакшена

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose установлены
- Порты 8000 и 5173 свободны

### Запуск проекта

1. Клонируйте репозиторий:

```bash
git clone https://github.com/gleb7499/The-southern-crown.git
cd The-southern-crown
cp backend/.env.example backend/.env
# Edit backend/.env and set SECRET_KEY, ADMIN_PASSWORD
```

2. Запустите проект через Docker Compose:

```bash
docker compose up --build
```

1. Откройте браузер:

- Фронтенд: <http://localhost:5173>
- Backend API: <http://localhost:8000>
- API документация: <http://localhost:8000/docs>

### Данные для входа

**Email:** <admin@example.com>  
**Пароль:** admin123 (или ваш ADMIN_PASSWORD из .env)

## Структура проекта

```text
The-southern-crown/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── cameras.py
│   │   │   ├── control_points.py
│   │   │   ├── farms.py
│   │   │   ├── reports.py
│   │   │   └── deps.py
│   │   ├── core/         # Конфигурация и утилиты
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── middleware/   # Middleware для безопасности
│   │   │   └── security.py
│   │   ├── models/       # SQLAlchemy модели
│   │   │   ├── user.py
│   │   │   ├── farm.py
│   │   │   └── camera.py
│   │   ├── schemas/      # Pydantic схемы
│   │   │   ├── auth.py
│   │   │   ├── farm.py
│   │   │   ├── camera.py
│   │   │   └── report.py
│   │   ├── main.py       # FastAPI приложение
│   │   └── init_db.py    # Инициализация БД
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React компоненты
│   │   │   ├── Modal.jsx
│   │   │   ├── AlertModal.jsx
│   │   │   ├── CalendarModal.jsx
│   │   │   ├── CameraPreviewModal.jsx
│   │   │   ├── DataOutputModal.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── ExportFormatModal.jsx
│   │   │   ├── Loading.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── pages/        # Страницы
│   │   │   ├── Login.jsx
│   │   │   ├── General.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/     # API клиенты
│   │   │   └── api.js
│   │   ├── styles/       # CSS стили
│   │   │   └── App.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml
```

## Функциональность

### 1. Авторизация

- JWT токены в HttpOnly cookies
- Автоматический редирект при 401
- Модальное окно с ошибкой при неверных данных

### 2. Раздел "Общее"

- Фильтрация по ферме, корпусу, точке контроля (множественный выбор)
- Отображение карточек с параметрами точек
- Красная модалка-алерт при критических событиях
- Поля ввода для основных параметров

### 3. Раздел "Отчёты"

- Горизонтальные фильтры
- Выбор показателя (средний вес, %, единобразие, стандартное отклонение)
- Календарь для выбора дат
- Генерация заглушек графиков
- Экспорт в XLSX/CSV (модалка выбора формата)

### 4. Раздел "Настройка"

- Создание точки контроля (ферма/корпус/точка)
- Добавление камер (URL + имя)
- Список камер с возможностью удаления
- Модалка предпросмотра камеры
- Модалка данных нового вывода с календарём

## API Endpoints

### Аутентификация

- `POST /auth/login` - вход в систему
- `POST /auth/logout` - выход
- `GET /auth/me` - текущий пользователь

### Фермы и корпуса

- `GET /api/farms` - список ферм
- `POST /api/farms` - создание фермы (администратор)
- `GET /api/buildings` - список корпусов
- `POST /api/buildings` - создание корпуса (администратор)

### Точки контроля

- `GET /api/control-points/` - список точек с фильтрацией
- `POST /api/control-points/` - создание точки
- `POST /api/control-points/full` - создание полной структуры (администратор)
- `GET /api/control-points/{id}` - получение точки

### Камеры

- `GET /api/cameras/` - список камер
- `POST /api/cameras/` - добавление камеры
- `DELETE /api/cameras/{id}` - удаление камеры

### Отчёты

- `POST /api/reports/generate` - генерация отчёта
- `GET /api/reports/alert` - получение алертов

### Другое

- `GET /health` - проверка здоровья API

## Архитектура и расширяемость

### Backend

Проект построен по принципу **разделения слоёв**:

- **API layer** - endpoints и валидация запросов
- **Business logic** - бизнес-логика (сейчас минимальная)
- **Data layer** - работа с БД через ORM

Для расширения:

1. **RBAC**: добавить поле `role` в User, создать декораторы проверки прав
2. **Новые параметры**: расширить модели и схемы
3. **Реальные графики**: заменить заглушки на агрегацию данных
4. **Интеграция камер**: добавить сервис для работы с RTSP/WebRTC
5. **История**: создать модель TimeSeriesData с foreign key на ControlPoint

### Frontend

Модульная структура:

- **Components** - переиспользуемые компоненты
- **Pages** - страницы-контейнеры
- **Services** - API клиенты
- **Styles** - централизованные стили

Для расширения:

1. **Графики**: интегрировать Chart.js или Recharts
2. **Формы**: добавить React Hook Form для валидации
3. **Состояние**: использовать Context API или Redux
4. **Камеры**: интегрировать WebRTC плеер

## Разработка без Docker

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.init_db
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## База данных

### SQLite (по умолчанию)

База создаётся автоматически при первом запуске в `backend/data/southern_crown.db`

### Переход на PostgreSQL

1. Обновите `DATABASE_URL` в `docker-compose.yml`:

```yaml
environment:
  - DATABASE_URL=postgresql://user:password@postgres:5432/dbname
```

2. Добавьте сервис PostgreSQL:

```yaml
postgres:
  image: postgres:15
  environment:
    POSTGRES_USER: user
    POSTGRES_PASSWORD: password
    POSTGRES_DB: dbname
```

3. Установите `psycopg2` в requirements.txt

## Безопасность

- ✅ JWT токены в HttpOnly cookies
- ✅ CORS настроен для локальной разработки
- ✅ Пароли хешируются через bcrypt
- ⚠️ Для продакшена: измените SECRET_KEY, настройте HTTPS, добавьте rate limiting

## Тестирование

### Backend тесты

```bash
cd backend
pytest
```

### Frontend тесты

```bash
cd frontend
npm test
```

## Производственный deployment

1. Измените `SECRET_KEY` в `.env`
2. Настройте реальную БД (PostgreSQL)
3. Добавьте Nginx для обратного прокси
4. Настройте SSL сертификаты
5. Используйте production build для фронтенда:

```bash
npm run build
```

## Реализованные улучшения

Проект полностью документирован и готов к использованию. Подробнее читайте:

- **[API.md](API.md)** - Полная документация всех API endpoints с примерами
- **[SECURITY.md](SECURITY.md)** - Руководство по безопасности и production deployment
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Итоговое резюме всех улучшений

### Безопасность

✅ Секретный ключ вынесен в переменные окружения  
✅ Заголовки безопасности (X-Frame-Options, CSP, и др.)  
✅ Rate limiting для предотвращения DoS атак  
✅ RBAC проверки для admin-only операций  
✅ Подробное логирование аутентификации  

### API

✅ Пагинация на всех list endpoints  
✅ Комплексная документация API (см. [API.md](API.md))  
✅ Валидация входных параметров  
✅ Правильная обработка ошибок  
✅ Health check endpoint (`GET /health`)  

### База данных

✅ Timestamps (created_at/updated_at) на всех моделях  
✅ Индексы на внешних ключах  
✅ Cascade deletes для целостности данных  
✅ Поддержка Alembic для миграций  

### Frontend

✅ ErrorBoundary для обработки ошибок  
✅ Loading состояния на всех страницах  
✅ Валидация форм перед отправкой  
✅ ARIA метки для доступности  
✅ Экспорт отчётов в XLSX/CSV  
✅ Модальное окно "Данные нового вывода" с полями ввода и календарём  

### Docker

✅ Multi-stage builds для меньшего размера образов  
✅ Health checks для контейнеров  
✅ Restart policies  
✅ Правильные зависимости сервисов  
✅ Non-root user для безопасности  

## Известные ограничения (MVP)

- Нет реальных графиков (заглушки)
- Упрощённый RBAC (только admin)
- Нет интеграции с камерами
- Нет исторических данных
- Отсутствие unit/integration тестов

Все эти моменты можно расширить благодаря модульной архитектуре.

## Лицензия

MIT

## Контакты

При возникновении вопросов создавайте Issue в репозитории.
