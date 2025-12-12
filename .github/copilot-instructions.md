# The Southern Crown - AI Coding Instructions

## Project Overview
Farm management admin panel with FastAPI backend and React frontend. Manages hierarchical structure: Farm → Building → Control Point → Camera. Russian language UI/documentation.

## Architecture

### Backend (FastAPI + SQLAlchemy + SQLite)
- **Entry point**: [backend/app/main.py](backend/app/main.py) - initializes FastAPI app, creates DB tables on startup
- **Database models** in [backend/app/models/](backend/app/models/): `Farm`, `Building`, `ControlPoint`, `Camera`, `User`
- **Schemas** in [backend/app/schemas/](backend/app/schemas/): Pydantic models for request/response validation
- **API routes** in [backend/app/api/](backend/app/api/): `auth`, `farms`, `control_points`, `cameras`, `reports`
- **Authentication**: Cookie-based JWT tokens (see [backend/app/api/deps.py](backend/app/api/deps.py#L7-L38))
  - Auth logic uses `get_current_user` dependency that reads token from cookies
  - Tokens stored in `access_token` cookie (httponly, samesite=lax, 24h expiry)
  - No Bearer token headers - always use cookies

### Frontend (React 18 + Vite + React Router)
- **Pages** in [frontend/src/pages/](frontend/src/pages/): `Login`, `General`, `Reports`, `Settings`
- **API client** at [frontend/src/services/api.js](frontend/src/services/api.js):
  - Axios with `withCredentials: true` for cookie-based auth
  - Global 401 interceptor redirects to `/login`
  - Empty `baseURL` - relies on Vite proxy in dev
- **Routing**: All dashboard pages use `/dashboard/*` prefix
- **State management**: Local component state with `useState` - no Redux/Context

## Database Schema
```
Farm (1) → (N) Building (1) → (N) ControlPoint (1) → (N) Camera
User (separate table for auth)
```
Key relationships in [backend/app/models/farm.py](backend/app/models/farm.py):
- SQLAlchemy `relationship()` with bidirectional `back_populates`
- `ControlPoint` has `day_of_development` and `average_deviation` tracking fields

## Development Workflows

### Run entire stack:
```bash
docker compose up --build
```
- Backend: http://localhost:8000 (API docs at `/docs`)
- Frontend: http://localhost:5173
- Default login: `admin@example.com` / `admin123`

### Backend only (Python):
```bash
cd backend
pip install -r requirements.txt
python -m app.init_db  # Creates DB and seed data
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend only (Node.js):
```bash
cd frontend
npm install
npm run dev
```

### Database initialization:
[backend/app/init_db.py](backend/app/init_db.py) creates:
- Admin user (email: admin@example.com, password: admin123)
- 3 sample farms with buildings, control points, and cameras
- Run explicitly with `python -m app.init_db` or automatically via Dockerfile CMD

## Key Conventions

### Backend Patterns
1. **Dependency injection**: Use `Depends(get_db)` for DB sessions, `Depends(get_current_user)` for auth
2. **Router structure**: Each domain has own router in `api/` folder with consistent naming (plural nouns)
3. **Response models**: Always specify `response_model` in route decorators for Pydantic validation
4. **Query filtering**: API endpoints accept comma-separated IDs (`?farm_ids=1,2,3`) parsed server-side
5. **Configuration**: Centralized in [backend/app/core/config.py](backend/app/core/config.py) using `pydantic-settings`

### Frontend Patterns
1. **Component structure**: Modals in `components/`, pages consume them directly
2. **API calls**: Destructure from domain-specific API objects (`farmsAPI`, `controlPointsAPI`, etc.)
3. **Error handling**: Let global axios interceptor handle 401s; show errors via local state
4. **Form submission**: Controlled components with `useState` for form data
5. **Styling**: Single CSS file at [frontend/src/styles/App.css](frontend/src/styles/App.css) - no CSS modules/styled-components

### Code Style
- **Backend**: Python with type hints (e.g., `def get_me(current_user: User = Depends(...)`) 
- **Frontend**: Functional components with hooks; no class components
- **Naming**: Russian in UI strings/comments, English in code identifiers
- **Imports**: Backend uses absolute imports with `app.` prefix

## Critical Integration Points

### CORS Configuration
[backend/app/main.py](backend/app/main.py#L9-L15): Allows `localhost:5173` and `localhost:3000`. Update when changing ports.

### API URL Resolution
Frontend uses empty `baseURL` in axios config - relies on:
- Docker: Both services on same `app-network`, frontend proxies to `backend:8000`
- Local dev: Configure Vite proxy or use full URLs

### Database Persistence
SQLite file location:
- Docker: `/app/data/southern_crown.db` (volume mounted as `backend-data`)
- Local: `./southern_crown.db` in backend directory

## Common Tasks

**Add new endpoint**: 
1. Create route in `backend/app/api/<domain>.py`
2. Add Pydantic schemas in `backend/app/schemas/<domain>.py`
3. Add API method to `frontend/src/services/api.js` under appropriate domain object

**Add new model field**:
1. Update SQLAlchemy model in `backend/app/models/`
2. Update Pydantic schemas in `backend/app/schemas/`
3. Drop/recreate DB or write migration (no Alembic setup currently)

**Add new page**:
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.jsx`
3. Add sidebar link in `frontend/src/components/Sidebar.jsx`
