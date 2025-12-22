# Настройка Pre-commit Hooks (Husky + lint-staged)

## 🎯 Что это делает

Автоматически проверяет и форматирует код **всего монорепозитория** перед каждым коммитом:

### Frontend

- **ESLint** - находит и исправляет проблемы JavaScript/React кода
- **Prettier** - форматирует JS/JSX/JSON/CSS в едином стиле

### Backend

- **Black** - автоформатирование Python кода
- **isort** - сортировка импортов
- **Flake8** - проверка стиля кода (PEP 8)

## 📦 Установка

### Шаг 1: Установите зависимости Node.js (корневая папка)

```bash
npm install
```

### Шаг 2: Установите зависимости Frontend

```bash
cd frontend
npm install
cd ..
```

### Шаг 3: Установите зависимости Backend (Python)

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Шаг 4: Инициализируйте Husky

```bash
npm run prepare
```

Эта команда создаст папку `.husky` с git hooks.

### Шаг 3: Сделайте pre-commit hook исполняемым (Linux/Mac)

```bash
chmod +x .husky/pre-commit
```

На Windows это не требуется.

## ✅ Проверка работы

1. **Проверить весь проект:**

   ```bash
   npm run lint
   ```

2. **Исправить все проблемы во всём проекте:**

   ```bash
   npm run format
   ```

3. **Frontend отдельно:**

   ```bash
   npm run frontend:lint       # Проверка
   npm run frontend:lint:fix   # Автофикс
   npm run frontend:format     # Форматирование
   ```

4. **Backend отдельно:**

   ```bash
   npm run backend:lint    # Проверка
   npm run backend:format  # Форматирование
   ```

5. **Проверить git hook:**

   ```bash
   # Измените любой файл
   gFrontend

**ESLint** ([frontend/.eslintrc.cjs](frontend/.eslintrc.cjs))

- Проверяет качество JavaScript/React кода
- Находит баги и антипаттерны
- Интегрирован с React и React Hooks

**Prettier** ([frontend/.prettierrc.json](frontend/.prettierrc.json))

- Форматирует код в едином стиле
- Настроен на одинарные кавычки, точки с запятой, 2 пробела

### Backend

**Black** ([backend/pyproject.toml](backend/pyproject.toml))

- Автоформатирование Python кода
- 100 символов на строку
- PEP 8 совместимый стиль

**isort** ([backend/pyproject.toml](backend/pyproject.toml))

- Автоматическая сортировка импортов
- Профиль "black" для совместимости

**Flake8** ([backend/.flake8](backend/.flake8))

- Проверка стиля кода (PEP 8)
- Максимальная сложность функций

### lint-staged (в [package.json](package.json))

```json
"lint-staged": {
  "frontend/**/*.{js,jsx}": [
    "cd frontend && eslint --fix",
### Весь проект

| Команда | Описание |
|---------|----------|
| `npm run lint` | Проверить весь проект (frontend + backend) |
| `npm run format` | Форматировать весь проект |

### Frontend

| Команда | Описание |
|---------|----------| (Frontend JS или Backend Python)
   ↓
2. git add файлы
   ↓
3. git commit -m "сообщение"
   ↓
4. Husky перехватывает commit
   ↓
5. lint-staged определяет типы файлов:
   │
   ├─→ Frontend (.js, .jsx) → ESLint + Prettier
   ├─→ Frontend (.json, .css) → Prettier
   └─→ Backend (.py) → Black + isort + Flake8
|---------|----------|
| `npm run backend:dev` | Запустить FastAPI сервер |
| `npm run backend:lint` | Проверить код (black + isort + flake8) |
| `npm run backend:format` | Форматировать код (black + isort)
    "cd backend && black",
    "cd backend && isort",
    "cd backend && flake8"
"lint-staged": {
  "*.{js,jsx}": [
    "eslint --fix",      // Сначала линтинг с автофиксом
    "prettier --write"   // Потом форматирование
  ],
  "*.{json,css,md}": [
    "prettier --write"   // Только форматирование для этих типов
  ]
}
```

## 🚀 Доступные команды

| Команда | Описание |
|---------|----------|
| `npm run lint` | Проверить код на ошибки |
| `npm run lint:fix` | Исправить ошибки автоматически |
| `npm run format` | Форматировать весь код |
| `npm run format:check` | Проверить форматирование без изменений |

## 🎭 Workflow

(Python + JavaScript) форматируется одинаково  
✅ **Меньше багов** - линтеры ловят проблемы до попадания в репозиторий  
✅ **Автоматизация** - не нужно помнить запускать линтер вручную  
✅ **Быстрота** - lint-staged проверяет только изменённые файлы  
✅ **Code Review** - меньше споров о стиле кода  
✅ **Монорепозиторий** - единая конфигурация для frontend и backend  
✅ **PEP 8** - backend код соответствует Python стандартам
   ↓
3. git commit -m "сообщение"
   ↓
4. Husky перехватывает commit
   ↓
5. lint-staged запускает ESLint и Prettier
   ↓
6. Если есть ошибки - коммит отменяется
   ↓
7. Исправьте ошибки и попробуйте снова
   ↓
8. Если всё OK - коммит проходит ✅

```

```bash
npm run prepare
chmod +x .husky/pre-commit  # Linux/Mac
```

**Проблема:** ESLint/Prettier ругается на все файлы  
**Решение:**

```bash
npm run frontend:lint:fix
npm run frontend:format
```

**Проблема:** Black/Flake8 ругается на Python файлы  
**Решение:**

```bash
npm run backend:format
```

**Проблема:** Windows не видит sh скрипт  
**Решение:** Установите Git Bash (входит в Git for Windows)

**Проблема:** Python линтеры не установлены  
**Решение:**

```bash
cd backend
pip install black isort flake8
```

**Проблема:** lint-staged зависает  
**Решение:** Проверьте что команды `cd frontend` и `cd backend` корректны для вашей ОСнные файлы  
✅ **Code Review** - меньше споров о стиле кода  

## 🔥 Интеграция в CI/CD

В будущем можно добавить в GitHub Actions:

```yaml
- name: Lint and Format Check
  run: |
    npm run lint
    npm run format:check
```

## 🛠️ Устранение проблем

**Проблема:** Hook не запускается  
**Решение:** Проверьте что `.husky` папка в git и что `npm run prepare` был выполнен

**Проблема:** ESLint ругается на все файлы  
**Решение:** Запустите `npm run lint:fix && npm run format` один раз для форматирования всего проекта

**Проблема:** Windows не видит sh скрипт  
**Решение:** Установите Git Bash или используйте WSL
