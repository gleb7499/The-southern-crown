# Линтинг всех типов файлов в проекте

## 🎯 Поддерживаемые типы файлов

Наша система линтинга покрывает **все** типы файлов в проекте:

### ✅ JavaScript / React

- **ESLint** - качество кода, ошибки, антипаттерны
- **Prettier** - форматирование
- **Автоисправление**: Да

### ✅ Python

- **Black** - форматирование
- **isort** - сортировка импортов
- **Flake8** - проверка стиля PEP 8
- **Автоисправление**: Да (Black + isort), Flake8 только проверяет

### ✅ Markdown (.md)

- **markdownlint** - структура, стиль, соответствие CommonMark
- **Prettier** - форматирование прозы
- **Автоисправление**: Да

### ✅ YAML (.yml, .yaml)

- **Prettier** - форматирование, проверка синтаксиса
- **Автоисправление**: Да

### ✅ JSON

- **Prettier** - форматирование, валидация синтаксиса
- **Автоисправление**: Да

### ✅ CSS

- **Prettier** - форматирование
- **Автоисправление**: Да

### ✅ EditorConfig

- **Базовые правила** для всех файлов (отступы, кодировка, переносы)
- **Автоматически** применяется редактором

## 📦 Установка

```bash
# Корень проекта
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && pip install -r requirements.txt && cd ..
```

## 🔧 Конфигурационные файлы

```
корень проекта/
├── .editorconfig              ← Базовые правила для всех файлов
├── .markdownlint.json         ← Правила для Markdown
├── package.json               ← lint-staged конфигурация
├── frontend/
│   ├── .eslintrc.cjs          ← ESLint для JS/React
│   └── .prettierrc.json       ← Prettier (JS, JSON, CSS, MD, YAML)
└── backend/
    ├── pyproject.toml         ← Black + isort
    └── .flake8                ← Flake8
```

## 🚀 Использование

### Проверка всего проекта

```bash
npm run lint              # Проверить всё (frontend + backend + markdown)
npm run format            # Исправить всё автоматически
```

### По типам файлов

```bash
npm run frontend:lint     # JavaScript/React
npm run frontend:format   # JavaScript/React автофикс

npm run backend:lint      # Python
npm run backend:format    # Python автофикс

npm run lint:md           # Markdown проверка
npm run lint:md:fix       # Markdown автофикс
```

## 🎭 Автоматический линтинг при коммите

При `git commit` автоматически запускается для **staged файлов**:

| Тип файла | Команды |
|-----------|---------|
| `*.{js,jsx}` | ESLint --fix → Prettier |
| `*.{json,css}` | Prettier |
| `*.py` | Black → isort → Flake8 |
| `*.md` | markdownlint --fix |
| `*.{yml,yaml}` | Prettier |

## 🔥 Как добавить новый тип файлов

### Пример: Добавить HTML линтинг

1. **Установите линтер:**

```bash
npm install --save-dev htmlhint
```

2. **Создайте конфиг** `.htmlhintrc`:

```json
{
  "tagname-lowercase": true,
  "attr-lowercase": true,
  "attr-value-double-quotes": true,
  "doctype-first": false,
  "tag-pair": true,
  "spec-char-escape": true,
  "id-unique": true,
  "src-not-empty": true
}
```

3. **Добавьте в `package.json`**:

```json
{
  "scripts": {
    "lint:html": "htmlhint \"**/*.html\" --ignore node_modules"
  },
  "lint-staged": {
    "**/*.html": ["htmlhint", "prettier --write"]
  }
}
```

### Пример: Добавить SQL линтинг

1. **Установите:**

```bash
npm install --save-dev sql-lint
```

2. **Добавьте в lint-staged:**

```json
{
  "lint-staged": {
    "**/*.sql": ["sql-lint", "prettier --write --parser sql"]
  }
}
```

### Пример: Добавить TypeScript

1. **Установите:**

```bash
cd frontend
npm install --save-dev typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

2. **Обновите `.eslintrc.cjs`:**

```js
module.exports = {
  extends: [
    // ... существующие
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  // ...
};
```

3. **Добавьте в lint-staged:**

```json
{
  "lint-staged": {
    "frontend/**/*.{ts,tsx}": [
      "cd frontend && eslint --fix",
      "cd frontend && prettier --write"
    ]
  }
}
```

## 🏗️ Архитектурные принципы

### 1. **Единая конфигурация**

- `.editorconfig` для базовых правил
- Специализированные конфиги для каждого типа

### 2. **Автоматизация**

- Pre-commit hooks для всех типов
- Только staged файлы проверяются

### 3. **Расширяемость**

- Легко добавить новые типы файлов
- Модульная структура lint-staged

### 4. **Производительность**

- Параллельная обработка разных типов
- Только изменённые файлы

### 5. **Консистентность**

- Prettier как единый форматтер где возможно
- Специализированные линтеры для логики

## 📋 Популярные линтеры по типам файлов

| Тип | Линтер | Автофикс | Установка |
|-----|--------|----------|-----------|
| JavaScript/TypeScript | ESLint | ✅ | `eslint` |
| Python | Black, isort, Flake8 | ✅/❌ | `pip install` |
| Markdown | markdownlint | ✅ | `markdownlint-cli` |
| JSON | Prettier | ✅ | встроено |
| YAML | Prettier, yamllint | ✅ | встроено |
| CSS/SCSS | Stylelint, Prettier | ✅ | `stylelint` |
| HTML | HTMLHint | ❌ | `htmlhint` |
| SQL | sql-lint | ❌ | `sql-lint` |
| Dockerfile | hadolint | ❌ | внешняя утилита |
| Shell | shellcheck | ❌ | внешняя утилита |
| Git commit | commitlint | ❌ | `@commitlint/cli` |

## ✅ Best Practices

1. **Всегда используйте .editorconfig** - базовый слой для всех редакторов
2. **Prettier для форматирования** - единый стиль где возможно
3. **Специализированные линтеры для логики** - качество кода
4. **Pre-commit hooks обязательны** - предотвращают проблемы
5. **Документируйте конфигурацию** - команда должна понимать правила

## 🎓 Обучение команды

После настройки покажите команде:

```bash
# Показать все доступные команды
npm run

# Проверить конкретный файл
npx eslint frontend/src/App.jsx
npx markdownlint README.md
cd backend && black --check app/main.py
```

Теперь ваш проект имеет **профессиональный уровень** линтинга всех типов файлов! 🚀
