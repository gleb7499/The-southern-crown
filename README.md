# The Southern Crown - Admin Panel

[![CI](https://github.com/gleb7499/the-southern-crown/actions/workflows/ci.yml/badge.svg)](https://github.com/gleb7499/the-southern-crown/actions/workflows/ci.yml)

Admin panel with a FastAPI backend and a React frontend for managing farms, buildings, control points, and cameras.

## Tech Stack

### Backend

- **FastAPI** - modern Python web framework
- **SQLAlchemy** - ORM for database access
- **SQLite** - database (easily replaced with PostgreSQL)
- **JWT** - token-based authentication
- **Pydantic** - data validation

### Frontend

- **React 18** - UI library
- **Vite** - bundler and dev server
- **React Router** - routing
- **Axios** - HTTP client

### Infrastructure

- **Docker & Docker Compose** - containerization
- **Nginx** - optional, for production

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Ports 8000 and 5173 available

### Running the Project

1. Clone the repository:

```bash
git clone https://github.com/gleb7499/The-southern-crown.git
cd The-southern-crown
```

2. Start the project with Docker Compose:

```bash
docker compose up --build
```

3. Open in browser:

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:8000>
- API documentation: <http://localhost:8000/docs>

### Login Credentials

The admin user is created automatically on first launch. Credentials are set via environment variables (see `docker-compose.yml`):

- `ADMIN_EMAIL` (default: `admin@example.com`)
- `ADMIN_PASSWORD` (default: `admin123`)

For production, always override both:

```bash
export ADMIN_EMAIL=your-email@example.com
export ADMIN_PASSWORD=your-secure-password
```

## Project Structure

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
│   │   ├── core/         # Configuration and utilities
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── middleware/   # Security middleware
│   │   │   └── security.py
│   │   ├── models/       # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── farm.py
│   │   │   └── camera.py
│   │   ├── schemas/      # Pydantic schemas
│   │   │   ├── auth.py
│   │   │   ├── farm.py
│   │   │   ├── camera.py
│   │   │   └── report.py
│   │   ├── main.py       # FastAPI application
│   │   └── init_db.py    # Database initialization
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
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
│   │   ├── pages/        # Pages
│   │   │   ├── Login.jsx
│   │   │   ├── General.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/     # API clients
│   │   │   └── api.js
│   │   ├── styles/       # CSS styles
│   │   │   └── App.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml
```

## Screenshots

![Login page](images/login.png)

![General section](images/general.png)

![Reports section](images/reports.png)

![Settings section](images/settings.png)

## Features

### 1. Authentication

- **JWT access token** in HttpOnly cookies (24-hour lifetime)
- Automatic redirect to `/login` when the token expires (401)
- Modal window with an error on invalid credentials
- Simple and reliable architecture without refresh tokens

### 2. "General" Section

- Filtering by farm, building, control point (multiple selection)
- Cards displaying control point parameters
- Red alert modal for critical events
- Input fields for main parameters

### 3. "Reports" Section

- Horizontal filters
- Metric selection (average weight, %, uniformity, standard deviation)
- Calendar for date selection
- Chart placeholder generation
- Export to XLSX/CSV (format selection modal)

### 4. "Settings" Section

- Creating a control point (farm/building/point)
- Adding cameras (URL + name)
- Camera list with delete option
- Camera preview modal
- New batch data modal with calendar

## API Endpoints

### Authentication

- `POST /auth/login` - sign in (returns JWT in httponly cookie)
- `POST /auth/logout` - sign out (deletes cookie)
- `GET /auth/me` - get current user data

**Note:** A simplified architecture with a single access_token (24 hours) is used. Refresh token is not used.

### Farms and Buildings

- `GET /api/farms` - list of farms
- `POST /api/farms` - create a farm (administrator)
- `GET /api/buildings` - list of buildings
- `POST /api/buildings` - create a building (administrator)

### Control Points

- `GET /api/control-points/` - list of points with filtering
- `POST /api/control-points/` - create a point
- `POST /api/control-points/full` - create a full structure (administrator)
- `GET /api/control-points/{id}` - get a point

### Cameras

- `GET /api/cameras/` - list of cameras
- `POST /api/cameras/` - add a camera
- `DELETE /api/cameras/{id}` - delete a camera

### Reports

- `POST /api/reports/generate` - generate a report
- `GET /api/reports/alert` - get alerts

### Other

- `GET /health` - API health check

## Architecture and Extensibility

### Backend

The project is built on the principle of **layer separation**:

- **API layer** - endpoints and request validation
- **Business logic** - business logic (currently minimal)
- **Data layer** - database access via ORM

To extend:

1. **RBAC**: add a `role` field to User, create permission check decorators
2. **New parameters**: extend models and schemas
3. **Real charts**: replace placeholders with data aggregation
4. **Camera integration**: add a service for RTSP/WebRTC
5. **History**: create a TimeSeriesData model with a foreign key to ControlPoint

### Frontend

Modular structure:

- **Components** - reusable components
- **Pages** - page containers
- **Services** - API clients
- **Styles** - centralized styles

To extend:

1. **Charts**: integrate Chart.js or Recharts
2. **Forms**: add React Hook Form for validation
3. **State**: use Context API or Redux
4. **Cameras**: integrate a WebRTC player

## Development Without Docker

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

## Database

### SQLite (default)

The database is created automatically on first launch in `backend/data/southern_crown.db`

### Migrating to PostgreSQL

1. Update `DATABASE_URL` in `docker-compose.yml`:

```yaml
environment:
  - DATABASE_URL=postgresql://user:password@postgres:5432/dbname
```

2. Add a PostgreSQL service:

```yaml
postgres:
  image: postgres:15
  environment:
    POSTGRES_USER: user
    POSTGRES_PASSWORD: password
    POSTGRES_DB: dbname
```

3. Install `psycopg2` in requirements.txt

## Security

- ✅ **JWT access_token** in HttpOnly cookies (24 hours)
- ✅ Simple architecture without refresh tokens
- ✅ CORS configured for local development
- ✅ Passwords hashed with bcrypt
- ✅ Built-in rate limiting (1000 req/min dev, 100 req/min prod)
- ⚠️ For production: change SECRET_KEY, set up HTTPS

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Production Deployment

1. Change `SECRET_KEY` in `.env`
2. Set up a real database (PostgreSQL)
3. Add Nginx as a reverse proxy
4. Set up SSL certificates
5. Use a production build for the frontend:

```bash
npm run build
```

## Implemented Improvements

The project is fully documented and ready to use. Read more:

- **[Interactive API docs](http://localhost:8000/docs)** (Swagger UI, available when the backend is running) - documentation of all API endpoints with examples
- **[SECURITY.md](SECURITY.md)** - Security guide and production deployment

### Security

✅ Secret key moved to environment variables  
✅ Security headers (X-Frame-Options, CSP, etc.)  
✅ Rate limiting to prevent DoS attacks  
✅ RBAC checks for admin-only operations  
✅ Detailed authentication logging  

### API

✅ Pagination on all list endpoints  
✅ Comprehensive API documentation (see Swagger UI at `/docs` when running)  
✅ Input parameter validation  
✅ Proper error handling  
✅ Health check endpoint (`GET /health`)  

### Database

✅ Timestamps (created_at/updated_at) on all models  
✅ Indexes on foreign keys  
✅ Cascade deletes for data integrity  
✅ Alembic support for migrations  

### Frontend

✅ ErrorBoundary for error handling  
✅ Loading states on all pages  
✅ Form validation before submission  
✅ ARIA labels for accessibility  
✅ Report export to XLSX/CSV  
✅ "New batch data" modal with input fields and calendar  

### Docker

✅ Multi-stage builds for smaller image sizes  
✅ Health checks for containers  
✅ Restart policies  
✅ Proper service dependencies  
✅ Non-root user for security  

## Known Limitations (MVP)

- No real charts (placeholders)
- Simplified RBAC (admin only)
- No camera integration
- No historical data
- No unit/integration tests

All of these can be extended thanks to the modular architecture.

## License

MIT

## Contacts

If you have questions, create an Issue in the repository.
