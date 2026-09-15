# Linting All File Types in the Project

## 🎯 Supported File Types

Our linting system covers **all** file types in the project:

### ✅ JavaScript / React

- **ESLint** - code quality, errors, anti-patterns
- **Prettier** - formatting
- **Auto-fix**: Yes

### ✅ Python

- **Black** - formatting
- **isort** - import sorting
- **Flake8** - PEP 8 style checking
- **Auto-fix**: Yes (Black + isort), Flake8 only checks

### ✅ Markdown (.md)

- **markdownlint** - structure, style, CommonMark compliance
- **Prettier** - prose formatting
- **Auto-fix**: Yes

### ✅ YAML (.yml, .yaml)

- **Prettier** - formatting, syntax checking
- **Auto-fix**: Yes

### ✅ JSON

- **Prettier** - formatting, syntax validation
- **Auto-fix**: Yes

### ✅ CSS

- **Prettier** - formatting
- **Auto-fix**: Yes

### ✅ EditorConfig

- **Base rules** for all files (indentation, encoding, line endings)
- Applied **automatically** by the editor

## 📦 Installation

```bash
# Project root
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && pip install -r requirements.txt && cd ..
```

## 🔧 Configuration Files

```
project root/
├── .editorconfig              ← Base rules for all files
├── .markdownlint.json         ← Markdown rules
├── package.json               ← lint-staged configuration
├── frontend/
│   ├── .eslintrc.cjs          ← ESLint for JS/React
│   └── .prettierrc.json       ← Prettier (JS, JSON, CSS, MD, YAML)
└── backend/
    ├── pyproject.toml         ← Black + isort
    └── .flake8                ← Flake8
```

## 🚀 Usage

### Checking the Whole Project

```bash
npm run lint              # Check everything (frontend + backend + markdown)
npm run format            # Fix everything automatically
```

### By File Type

```bash
npm run frontend:lint     # JavaScript/React
npm run frontend:format   # JavaScript/React autofix

npm run backend:lint      # Python
npm run backend:format    # Python autofix

npm run lint:md           # Markdown check
npm run lint:md:fix       # Markdown autofix
```

## 🎭 Automatic Linting on Commit

On `git commit`, automatically runs for **staged files**:

| File type | Commands |
|-----------|---------|
| `*.{js,jsx}` | ESLint --fix → Prettier |
| `*.{json,css}` | Prettier |
| `*.py` | Black → isort → Flake8 |
| `*.md` | markdownlint --fix |
| `*.{yml,yaml}` | Prettier |

## 🔥 How to Add a New File Type

### Example: Add HTML Linting

1. **Install the linter:**

```bash
npm install --save-dev htmlhint
```

2. **Create a config** `.htmlhintrc`:

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

3. **Add to `package.json`**:

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

### Example: Add SQL Linting

1. **Install:**

```bash
npm install --save-dev sql-lint
```

2. **Add to lint-staged:**

```json
{
  "lint-staged": {
    "**/*.sql": ["sql-lint", "prettier --write --parser sql"]
  }
}
```

### Example: Add TypeScript

1. **Install:**

```bash
cd frontend
npm install --save-dev typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

2. **Update `.eslintrc.cjs`:**

```js
module.exports = {
  extends: [
    // ... existing
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  // ...
};
```

3. **Add to lint-staged:**

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

## 🏗️ Architectural Principles

### 1. **Single Configuration**

- `.editorconfig` for base rules
- Specialized configs for each type

### 2. **Automation**

- Pre-commit hooks for all types
- Only staged files are checked

### 3. **Extensibility**

- Easy to add new file types
- Modular lint-staged structure

### 4. **Performance**

- Parallel processing of different types
- Only changed files

### 5. **Consistency**

- Prettier as the single formatter where possible
- Specialized linters for logic

## 📋 Popular Linters by File Type

| Type | Linter | Autofix | Installation |
|-----|--------|----------|-----------|
| JavaScript/TypeScript | ESLint | ✅ | `eslint` |
| Python | Black, isort, Flake8 | ✅/❌ | `pip install` |
| Markdown | markdownlint | ✅ | `markdownlint-cli` |
| JSON | Prettier | ✅ | built-in |
| YAML | Prettier, yamllint | ✅ | built-in |
| CSS/SCSS | Stylelint, Prettier | ✅ | `stylelint` |
| HTML | HTMLHint | ❌ | `htmlhint` |
| SQL | sql-lint | ❌ | `sql-lint` |
| Dockerfile | hadolint | ❌ | external tool |
| Shell | shellcheck | ❌ | external tool |
| Git commit | commitlint | ❌ | `@commitlint/cli` |

## ✅ Best Practices

1. **Always use .editorconfig** - base layer for all editors
2. **Prettier for formatting** - single style where possible
3. **Specialized linters for logic** - code quality
4. **Pre-commit hooks are mandatory** - prevent problems
5. **Document the configuration** - the team must understand the rules

## 🎓 Team Onboarding

After setup, show the team:

```bash
# Show all available commands
npm run

# Check a specific file
npx eslint frontend/src/App.jsx
npx markdownlint README.md
cd backend && black --check app/main.py
```

Now your project has a **professional level** of linting for all file types! 🚀
