# Setting Up Pre-commit Hooks (Husky + lint-staged)

## 🎯 What This Does

Automatically checks and formats code in the **entire monorepo** before each commit:

### Frontend

- **ESLint** - finds and fixes JavaScript/React code issues
- **Prettier** - formats JS/JSX/JSON/CSS in a single style

### Backend

- **Black** - auto-formatting of Python code
- **isort** - import sorting
- **Flake8** - code style checking (PEP 8)

## 📦 Installation

### Step 1: Install Node.js Dependencies (Root Folder)

```bash
npm install
```

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 3: Install Backend Dependencies (Python)

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Step 4: Initialize Husky

```bash
npm run prepare
```

This command creates a `.husky` folder with git hooks.

### Step 3: Make the Pre-commit Hook Executable (Linux/Mac)

```bash
chmod +x .husky/pre-commit
```

This is not required on Windows.

## ✅ Verifying It Works

1. **Check the whole project:**

   ```bash
   npm run lint
   ```

2. **Fix all issues in the whole project:**

   ```bash
   npm run format
   ```

3. **Frontend separately:**

   ```bash
   npm run frontend:lint       # Check
   npm run frontend:lint:fix   # Autofix
   npm run frontend:format     # Format
   ```

4. **Backend separately:**

   ```bash
   npm run backend:lint    # Check
   npm run backend:format  # Format
   ```

5. **Check the git hook:**

   ```bash
   # Change any file
   gFrontend

**ESLint** ([frontend/.eslintrc.cjs](frontend/.eslintrc.cjs))

- Checks JavaScript/React code quality
- Finds bugs and anti-patterns
- Integrated with React and React Hooks

**Prettier** ([frontend/.prettierrc.json](frontend/.prettierrc.json))

- Formats code in a single style
- Configured for single quotes, semicolons, 2 spaces

### Backend

**Black** ([backend/pyproject.toml](backend/pyproject.toml))

- Auto-formatting of Python code
- 100 characters per line
- PEP 8 compatible style

**isort** ([backend/pyproject.toml](backend/pyproject.toml))

- Automatic import sorting
- "black" profile for compatibility

**Flake8** ([backend/.flake8](backend/.flake8))

- Code style checking (PEP 8)
- Maximum function complexity

### lint-staged (in [package.json](package.json))

```json
"lint-staged": {
  "frontend/**/*.{js,jsx}": [
    "cd frontend && eslint --fix",
### Whole Project

| Command | Description |
|---------|----------|
| `npm run lint` | Check the whole project (frontend + backend) |
| `npm run format` | Format the whole project |

### Frontend

| Command | Description |
|---------|----------| (Frontend JS or Backend Python)
   ↓
2. git add files
   ↓
3. git commit -m "message"
   ↓
4. Husky intercepts the commit
   ↓
5. lint-staged determines file types:
   │
   ├─→ Frontend (.js, .jsx) → ESLint + Prettier
   ├─→ Frontend (.json, .css) → Prettier
   └─→ Backend (.py) → Black + isort + Flake8
|---------|----------|
| `npm run backend:dev` | Start the FastAPI server |
| `npm run backend:lint` | Check code (black + isort + flake8) |
| `npm run backend:format` | Format code (black + isort) |
    "cd backend && black",
    "cd backend && isort",
    "cd backend && flake8"
"lint-staged": {
  "*.{js,jsx}": [
    "eslint --fix",      // Lint with autofix first
    "prettier --write"   // Then formatting
  ],
  "*.{json,css,md}": [
    "prettier --write"   // Formatting only for these types
  ]
}
```

## 🚀 Available Commands

| Command | Description |
|---------|----------|
| `npm run lint` | Check code for errors |
| `npm run lint:fix` | Fix errors automatically |
| `npm run format` | Format all code |
| `npm run format:check` | Check formatting without changes |

## 🎭 Workflow

(Python + JavaScript) is formatted the same way  
✅ **Fewer bugs** - linters catch problems before they reach the repository  
✅ **Automation** - no need to remember to run the linter manually  
✅ **Speed** - lint-staged checks only changed files  
✅ **Code Review** - fewer style arguments  
✅ **Monorepo** - single configuration for frontend and backend  
✅ **PEP 8** - backend code follows Python standards  
   ↓
3. git commit -m "message"
   ↓
4. Husky intercepts the commit
   ↓
5. lint-staged runs ESLint and Prettier
   ↓
6. If there are errors - the commit is cancelled
   ↓
7. Fix the errors and try again
   ↓
8. If everything is OK - the commit passes ✅

```

```bash
npm run prepare
chmod +x .husky/pre-commit  # Linux/Mac
```

**Problem:** ESLint/Prettier complains about all files  
**Solution:**

```bash
npm run frontend:lint:fix
npm run frontend:format
```

**Problem:** Black/Flake8 complains about Python files  
**Solution:**

```bash
npm run backend:format
```

**Problem:** Windows does not see the sh script  
**Solution:** Install Git Bash (included in Git for Windows)

**Problem:** Python linters are not installed  
**Solution:**

```bash
cd backend
pip install black isort flake8
```

**Problem:** lint-staged hangs  
**Solution:** Make sure the `cd frontend` and `cd backend` commands are correct for your OSd files  
✅ **Code Review** - fewer style arguments  

## 🔥 CI/CD Integration

In the future, this can be added to GitHub Actions:

```yaml
- name: Lint and Format Check
  run: |
    npm run lint
    npm run format:check
```

## 🛠️ Troubleshooting

**Problem:** The hook does not run  
**Solution:** Make sure the `.husky` folder is in git and that `npm run prepare` was executed

**Problem:** ESLint complains about all files  
**Solution:** Run `npm run lint:fix && npm run format` once to format the whole project

**Problem:** Windows does not see the sh script  
**Solution:** Install Git Bash or use WSL
