# 🧪 Guide to Testing Changes in the Monorepo

A step-by-step guide to testing database and backend changes separately from the frontend.

---

## 📋 Testing Order (Bottom-Up)

### 1️⃣ Checking Python Code (Static)

```powershell
# Go to backend
cd c:\Users\kseni\Documents\Фриланс\The-southern-crown\backend

# Check syntax of all files
python -m py_compile app/models/*.py
python -m py_compile app/schemas/*.py
python -m py_compile app/api/*.py
```

**What is checked**: Syntax errors, imports, basic types  
**If OK**: No output or "Compiled X files"  
**If error**: You will see SyntaxError or ImportError

---

### 2️⃣ Testing Database Structure

```powershell
# Run the database structure test
python test_db.py
```

**What is checked**:

- ✅ All tables created (user, farm, control_point, growth_rate, report, camera)
- ✅ Correct fields in each table
- ✅ Foreign keys and relationships
- ✅ SQLAlchemy relationships

**Expected result**:

```
🧪 DATABASE STRUCTURE TESTING
===================================================
✅ All tables created
✅ All relationships found
🎉 ALL CHECKS PASSED!
```

---

### 3️⃣ Testing Pydantic Schemas

```powershell
# Run the schema test
python test_schemas.py
```

**What is checked**:

- ✅ Validation of all Create schemas
- ✅ Validation of all Response schemas
- ✅ Correct field types
- ✅ Required/optional fields

**Expected result**:

```
🧪 PYDANTIC SCHEMA TESTING
===================================================
✅ 10 schemas passed, ❌ 0 failed
🎉 ALL SCHEMAS PASSED VALIDATION!
```

---

### 4️⃣ Creating a Database with Test Data

```powershell
# Delete the old database (if any)
Remove-Item southern_crown.db -ErrorAction SilentlyContinue

# Create a new database with seed data
python -m app.init_db
```

**What happens**:

- All tables are created
- An admin user is created (<admin@example.com> / admin123)
- 3 farms are created with control points, cameras, growth_rates, reports

**Expected result**:

```
Created admin user: admin@example.com / admin123
Created sample farms, control points, cameras, growth rates, and reports
Database initialized successfully
```

---

### 5️⃣ Viewing the Database (Optional)

**Option A: Via Python**

```powershell
python
```

```python
import sqlite3
conn = sqlite3.connect('southern_crown.db')
cursor = conn.cursor()

# View all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()

# View farms
cursor.execute("SELECT * FROM farm").fetchall()

# View control points
cursor.execute("SELECT * FROM control_point").fetchall()

conn.close()
exit()
```

**Option B: Install DB Browser for SQLite**

- Download: <https://sqlitebrowser.org/>
- Open the `southern_crown.db` file
- Visually inspect all tables and data

---

### 6️⃣ Starting the Backend Server

```powershell
# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected result**:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
```

---

### 7️⃣ Testing the API via Swagger UI

1. **Open browser**: <http://localhost:8000/docs>
2. **Log in**:
   - Find `POST /api/auth/login`
   - Click "Try it out"
   - Enter:

     ```json
     {
       "email": "admin@example.com",
       "password": "admin123"
     }
     ```

   - Click "Execute"
   - It should return status 200

3. **Check endpoints**:
   - `GET /api/farms` - get the list of farms
   - `GET /api/control-points/` - get control points
   - `GET /api/cameras/` - get cameras

**What we test**:

- ✅ Authentication works
- ✅ API returns data from the database
- ✅ Relationships work (farm → control_points)
- ✅ Pydantic validation works

---

### 8️⃣ Testing the API via curl/PowerShell (Alternative)

```powershell
# Login
$response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"admin123"}' `
  -SessionVariable session

# Get farms
Invoke-RestMethod -Uri "http://localhost:8000/api/farms" `
  -Method GET `
  -WebSession $session

# Get control points
Invoke-RestMethod -Uri "http://localhost:8000/api/control-points/" `
  -Method GET `
  -WebSession $session
```

---

### 9️⃣ Running via Docker (Full Stack)

```powershell
# Return to the project root
cd c:\Users\kseni\Documents\Фриланс\The-southern-crown

# Stop and remove old containers
docker compose down -v

# Build and start
docker compose up --build
```

**What starts**:

- Backend at <http://localhost:8000>
- Frontend at <http://localhost:5173>

**Testing**:

1. Open <http://localhost:8000/docs> - check Swagger
2. Open <http://localhost:5173> - check the frontend

---

## 🎯 Final Checklist

- [ ] Python code compiles without errors
- [ ] test_db.py passes successfully
- [ ] test_schemas.py passes successfully
- [ ] init_db.py creates the database without errors
- [ ] Backend server starts
- [ ] Swagger UI shows all endpoints
- [ ] Login works via Swagger
- [ ] GET endpoints return data
- [ ] Docker compose starts (optional)
- [ ] Frontend connects to backend (optional)

---

## 🐛 Common Problems

### ModuleNotFoundError

```powershell
# Install dependencies
pip install -r requirements.txt
```

### Database is locked

```powershell
# Stop all Python processes
# Delete the database file
Remove-Item southern_crown.db
# Recreate
python -m app.init_db
```

### Port 8000 is in use

```powershell
# Find the process
netstat -ano | findstr :8000
# Kill the process (replace PID)
taskkill /PID <process_id> /F
```

---

## 💡 Tips

1. **Test bottom-up**: Database → Schemas → API → Frontend
2. **Do not start the frontend** until the backend works
3. **Use Swagger UI** - it is the fastest way to test the API
4. **Check the logs** - they will show where the error is
5. **Make commits** after each successful step

---

**Author**: AI Assistant  
**Date**: December 23, 2025
