# Claude AI Assistant Guide - SisyphusX

> Last updated: 2026-01-28

## Project Overview

**SisyphusX** is an AI-driven enterprise-level automated testing platform that provides visual test management, scenario orchestration, and multi-engine test execution capabilities.

### Core Purpose
Enable teams to create, manage, and execute automated tests through a visual interface while supporting code-driven workflows for advanced users.

### Architecture
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  React Frontend │ ───> │  FastAPI Backend│ ───> │  Test Engines   │
│  (TypeScript)   │      │  (Python)       │      │  (Python)       │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                              │                         │
                              ▼                         ▼
                       ┌─────────────┐         ┌─────────────┐
                       │ PostgreSQL  │         │  YAML Test  │
                       │   / SQLite  │         │  Execution  │
                       └─────────────┘         └─────────────┘
```

---

## Quick Reference

### Environment Setup

**Frontend Development:**
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

**Backend Development:**
```bash
# Activate conda environment
conda activate platform-auto

# Navigate to backend
cd backend

# Install dependencies (from root requirements.txt)
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload  # http://localhost:8000
```

**Infrastructure Services:**
```bash
# Start PostgreSQL, Redis, MinIO
docker compose up -d
```

**API Engine (Standalone Test Runner):**
```bash
cd engines/api-engine
pip install -r requirements.txt
python setup.py install
huace-apirun --cases=测试用例路径 -sv --capture=tee-sys
```

### Key Technologies

**Frontend Stack:**
- React 19.2.0 + TypeScript 5.9
- Vite 7.2 (build tool)
- Tailwind CSS + shadcn/ui (styling)
- React Router v7 (routing)
- React Query v5 (server state)
- ReactFlow v11 (workflow editor)
- Monaco Editor (code editing)
- i18next (internationalization)

**Backend Stack:**
- FastAPI (web framework)
- SQLModel (ORM - SQLAlchemy + Pydantic)
- PostgreSQL/SQLite (database)
- Redis (caching)
- httpx (HTTP client)
- Alembic (migrations)

**Test Engines:**
- api-engine: YAML-driven API test execution
- web-engine: Web UI automation (planned)
- app-engine: Mobile app automation (planned)

---

## Project Structure

```
sisyphus/
├── frontend/                    # React 19 frontend
│   ├── src/
│   │   ├── api/                # API client (Axios)
│   │   │   └── client.ts       # Centralized API methods
│   │   ├── components/         # React components
│   │   │   ├── common/         # EmptyState, ConfirmDialog, Pagination
│   │   │   ├── layout/         # AppLayout, Sidebar
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── contexts/           # Global state (Auth, Theme, Sidebar)
│   │   ├── i18n/               # Internationalization
│   │   │   └── locales/        # zh-CN.json, en-US.json
│   │   ├── pages/              # Page components
│   │   │   ├── api-automation/ # API testing pages
│   │   │   ├── auth/           # Login/Register
│   │   │   ├── interface/      # API management
│   │   │   ├── scenario/       # Workflow orchestration
│   │   │   ├── cases/          # Test case management
│   │   │   ├── plans/          # Test plans
│   │   │   └── reports/        # Test reports
│   │   ├── config/             # App configuration
│   │   ├── lib/                # Utilities (cn() helper)
│   │   └── types/              # TypeScript types
│   ├── .env                    # Environment variables
│   ├── package.json
│   ├── vite.config.ts          # Vite config with @ alias
│   └── tsconfig.json
│
├── backend/                     # FastAPI backend
│   └── app/
│       ├── api/
│       │   └── v1/
│       │       ├── api.py              # Router registration
│       │       └── endpoints/          # API route handlers
│       │           ├── projects.py     # Project CRUD + environments
│       │           ├── interfaces.py   # API management
│       │           ├── scenarios.py    # Workflow execution
│       │           ├── keywords.py     # Keyword management
│       │           ├── auth.py         # Authentication
│       │           ├── dashboard.py    # Statistics
│       │           └── ...
│       ├── core/
│       │   ├── config.py      # Settings from env
│       │   ├── db.py          # Database connection
│       │   └── security.py    # JWT auth
│       ├── models/             # SQLModel database tables
│       │   ├── project.py     # Project, Interface, Environment
│       │   ├── scenario.py    # Scenario, Node, Edge
│       │   ├── keyword.py     # Keyword definitions
│       │   └── ...
│       ├── schemas/            # Pydantic request/response models
│       ├── services/           # Business logic layer
│       └── main.py             # FastAPI app entry point
│
├── engines/                     # Test execution engines
│   ├── api-engine/             # YAML-driven API testing
│   │   ├── apirun/            # Core runner logic
│   │   ├── setup.py           # Package setup
│   │   └── examples/          # Example YAML test cases
│   ├── web-engine/             # Web UI automation (placeholder)
│   └── app-engine/             # Mobile automation (placeholder)
│
├── .env                         # Root environment config
├── .gitignore
├── docker-compose.yml           # Infrastructure services
├── requirements.txt             # Python dependencies
├── README.md                    # User-facing documentation
├── AGENTS.md                    # AI agent development guide
└── CLAUDE.md                    # This file
```

---

## Development Workflows

### Adding a New Feature

**1. Backend (FastAPI):**
```python
# 1. Create model in backend/app/models/feature.py
from sqlmodel import SQLModel, Field
from datetime import datetime

class Feature(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 2. Create schemas in backend/app/schemas/feature.py
from pydantic import BaseModel

class FeatureCreate(BaseModel):
    name: str

class FeatureResponse(Feature):
    pass

# 3. Create endpoint in backend/app/api/v1/endpoints/feature.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_session
from app.models.feature import Feature

router = APIRouter()

@router.get("/features")
async def list_features(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Feature))
    return result.scalars().all()

# 4. Register in backend/app/api/v1/api.py
from app.api.v1.endpoints import feature
api_router.include_router(feature.router, prefix="/features", tags=["features"])
```

**2. Frontend (React + TypeScript):**
```typescript
// 1. Add API client in frontend/src/api/client.ts
export const featuresApi = {
  list: () => api.get('/features/'),
  get: (id: number) => api.get(`/features/${id}`),
  create: (data: { name: string }) => api.post('/features/', data),
}

// 2. Create page component in frontend/src/pages/feature/FeatureList.tsx
import { useQuery } from '@tanstack/react-query'
import { featuresApi } from '@/api/client'

export function FeatureList() {
  const { data, isLoading } = useQuery({
    queryKey: ['features'],
    queryFn: () => featuresApi.list().then(res => res.data)
  })

  if (isLoading) return <div>Loading...</div>
  return <div>{/* render features */}</div>
}

// 3. Add route in frontend/src/App.tsx
import { FeatureList } from './pages/feature/FeatureList'

// Add to router configuration
```

### Adding Database Migrations

```bash
cd backend

# Create migration
alembic revision --autogenerate -m "Add feature table"

# Apply migration
alembic upgrade head
```

### Creating Reusable Components

**Location:** `frontend/src/components/common/`

**Example:**
```typescript
// ConfirmDialog component supports text verification
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Project"
  description="Type project name to confirm"
  verificationText={projectName}  // User must type this to confirm
  isDestructive={true}
/>
```

---

## Code Style & Conventions

### Frontend (TypeScript)

**Import Order:**
```typescript
// 1. External libraries (React first)
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Third-party libraries
import { ArrowLeft } from 'lucide-react'

// 3. Internal modules (@ alias)
import { cn } from '@/lib/utils'
import { projectsApi } from '@/api/client'
```

**Naming:**
- Components: `PascalCase` (e.g., `UserList.tsx`)
- Functions/variables: `camelCase` (e.g., `fetchUserData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Files: Match export name (PascalCase for components, camelCase for utilities)

**Type Safety:**
```typescript
// AVOID any - use unknown or specific types
const data: unknown = fetchData()

// Use interfaces for component props
interface Props {
  title: string
  isLoading?: boolean
  onSubmit: () => void
}
```

**State Management:**
```typescript
// Local state
const [isOpen, setIsOpen] = useState(false)

// Server state (React Query)
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.list()
})

// Global state (Context)
const { user } = useAuth()
```

### Backend (Python)

**Import Order:**
```python
# 1. Standard library
from typing import Optional, List
from datetime import datetime

# 2. Third-party libraries
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

# 3. Local modules
from app.core.db import get_session
from app.models.project import Project
```

**Naming:**
- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `snake_case.py`

**Type Annotations:**
```python
async def create_project(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_session)
) -> ProjectResponse:
    project = Project(**data.model_dump())
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project
```

**Database Operations:**
```python
# Query single
user = await session.get(User, user_id)

# Query with conditions
result = await session.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()

# Create
session.add(user)
await session.commit()
await session.refresh(user)

# Delete
await session.delete(user)
await session.commit()
```

---

## Configuration Management

### Environment Variables

**Root `.env` (Backend):**
```env
# Database
DATABASE_URL=sqlite+aiosqlite:///sisyphus.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# App
SECRET_KEY=change_this_in_production
PROJECT_NAME="Sisyphus X"
API_V1_STR=/api/v1

# Auth
AUTH_DISABLED=true  # Set to false in production
```

**Frontend `.env`:**
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true  # Bypass login in dev
```

**Access in Frontend:**
```typescript
const apiBaseURL = import.meta.env.VITE_API_BASE_URL
```

**Access in Backend:**
```python
from app.core.config import settings
db_url = settings.DATABASE_URL
```

### Frontend Config

**Location:** `frontend/src/config/index.ts`

```typescript
const config = {
  apiBaseURL: import.meta.env.VITE_API_BASE_URL,
  appName: 'Sisyphus',
  defaultPageSize: 10,
  storageKeys: {
    token: 'sisyphus-token',
    theme: 'sisyphus-theme'
  }
}
```

---

## API Architecture

### API Client Design

**Centralized API Client:** `frontend/src/api/client.ts`

All API calls use pre-configured Axios instance with:
- Automatic JWT token injection from localStorage
- 401 error handling (auto-redirect to login)
- Consistent error handling

**Usage:**
```typescript
import { projectsApi, interfacesApi } from '@/api/client'

// GET request
const { data } = await projectsApi.list({ page: 1, size: 10 })

// POST request
await projectsApi.create({ name: 'New Project', key: 'PROJ', owner: 'John' })

// DELETE request
await projectsApi.delete(id)
```

### Backend API Structure

**Router Registration:** `backend/app/api/v1/api.py`

All routers use:
- `Depends(deps.get_current_user)` for authentication (except auth endpoints)
- Consistent prefix: `/api/v1/{resource}`
- Tag grouping for OpenAPI docs

**Example Endpoint:**
```python
@router.get("/")
async def list_projects(
    page: int = 1,
    size: int = 10,
    session: AsyncSession = Depends(get_session)
):
    # Implementation
    pass
```

---

## Authentication Flow

### Frontend
1. Login stores JWT token in `localStorage` (key: `sisyphus-token`)
2. Axios interceptor adds `Authorization: Bearer <token>` to all requests
3. 401 response triggers redirect to `/login` (excluding auth endpoints)
4. Dev mode: Set `VITE_DEV_MODE_SKIP_LOGIN=true` to bypass

### Backend
1. JWT token validation via `app.api.deps.get_current_user`
2. OAuth support (GitHub/Google) - configured in `.env`
3. Can disable auth with `AUTH_DISABLED=true` (dev mode)

### Protected Routes
```python
from app.api import deps

@router.get("/protected")
async def protected_route(
    current_user: User = Depends(deps.get_current_user)
):
    # current_user is available
    pass
```

---

## Key Features Implementation

### 1. API Management (Interface Editor)

**Backend:** `backend/app/api/v1/endpoints/interfaces.py`
**Frontend:** `frontend/src/pages/interface/`

Features:
- CRUD for API endpoints
- Folder organization (tree structure)
- Import from Swagger/OpenAPI
- Real-time request debugging
- cURL command parsing

### 2. Scenario Orchestration

**Backend:** `backend/app/api/v1/endpoints/scenarios.py`
**Frontend:** `frontend/src/pages/scenario/`

Features:
- Visual workflow editor using ReactFlow
- Node-based test composition
- Scenario execution with results
- Drag-and-drop interface

### 3. Keyword-Driven Testing

**Backend:** `backend/app/api/v1/endpoints/keywords.py`
**Frontend:** Keyword editor pages

Features:
- Define reusable test keywords
- Code template generation
- Variable extraction
- Parameter management

### 4. Test Execution

**Engine:** `engines/api-engine/`

Workflow:
1. Frontend sends graph data to `/api/v1/scenarios/run`
2. Backend validates and converts to YAML
3. api-engine executes YAML test case
4. Results returned and stored in database

---

## Internationalization (i18n)

**Setup:** `frontend/src/i18n/`

**Locales:**
- `zh-CN.json` - Chinese (Simplified)
- `en-US.json` - English

**Usage:**
```typescript
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()
  return <h1>{t('nav.dashboard')}</h1>
}
```

**Adding Translations:**
```json
// zh-CN.json
{
  "nav": {
    "dashboard": "仪表板"
  }
}

// en-US.json
{
  "nav": {
    "dashboard": "Dashboard"
  }
}
```

---

## Component Library

### shadcn/ui Components

Location: `frontend/src/components/ui/`

Installed components:
- Dialog
- Dropdown Menu
- Scroll Area
- Switch
- Tabs
- Tooltip

**Custom Components:**
- `MonacoEditor.tsx` - Code editor wrapper
- `CustomSelect.tsx` - Enhanced select
- `StatusBadge.tsx` - Status display
- `Toast.tsx` - Notification system

### Common Components

Location: `frontend/src/components/common/`

- `EmptyState.tsx` - Placeholder for empty lists
- `ConfirmDialog.tsx` - Confirmation dialog with text verification
- `Pagination.tsx` - List pagination

---

## Common Patterns

### Async Data Fetching

```typescript
// Using React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', projectId],
  queryFn: () => projectsApi.get(projectId).then(res => res.data)
})

// Mutation with invalidation
const mutation = useMutation({
  mutationFn: (data) => projectsApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }
})
```

### Form Handling

```typescript
const [formData, setFormData] = useState({
  name: '',
  url: '',
  method: 'GET'
})

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }))
}
```

### Error Handling

**Frontend:**
```typescript
try {
  await projectsApi.create(data)
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error(error.response?.data?.detail)
  }
}
```

**Backend:**
```python
from fastapi import HTTPException, status

if not project:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Project not found"
    )
```

---

## Testing

### Current Status
- No testing framework configured yet
- AGENTS.md recommends adding:
  - Backend: pytest
  - Frontend: Vitest

### Manual Testing
```bash
# Backend API docs
open http://localhost:8000/docs

# Frontend dev server
npm run dev
```

### API Engine Testing
```bash
cd engines/api-engine
huace-apirun --cases=examples/example_case.yaml -sv
```

---

## Build & Deployment

### Frontend Build
```bash
cd frontend
npm run build          # Production build to dist/
npm run preview        # Preview production build
```

### Backend Deployment
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Docker Services
```bash
docker compose up -d    # Start all services
docker compose down     # Stop all services
```

---

## Prohibited Actions

1. **NEVER** use `as any`, `@ts-ignore`, or `@ts-expect-error` in frontend
2. **NEVER** use empty catch blocks - always log or handle errors
3. **NEVER** hardcode sensitive data (use environment variables)
4. **NEVER** store passwords/keys in localStorage (frontend)
5. **NEVER** return password hashes in API responses (backend)
6. **NEVER** commit `.env` files (use `.env.example`)

---

## Commit Conventions

```
feat: new feature
fix: bug fix
docs: documentation changes
style: code formatting (no logic change)
refactor: code refactoring
perf: performance improvement
test: adding/updating tests
chore: build/tools/config

# Examples
feat: add Swagger import functionality
fix: resolve infinite loop in keyword editor
docs: update API documentation
refactor: extract reusable components
```

---

## Troubleshooting

### Common Issues

**CORS Errors:**
- Check `backend/app/main.py` CORS middleware
- Ensure frontend URL is in `allow_origins`

**401 Unauthorized:**
- Check if token exists in localStorage
- Verify `SECRET_KEY` matches in backend
- Check if `AUTH_DISABLED=true` in dev mode

**Database Connection:**
- Ensure PostgreSQL is running: `docker compose up -d postgres`
- Check `DATABASE_URL` in `.env`
- For SQLite: Ensure file path is writable

**Import Errors (@ alias):**
- Check `vite.config.ts` has `@` pointing to `./src`
- Check `tsconfig.json` has path mapping

**Engine Not Found:**
- Run `python setup.py install` in engine directory
- Check `pip list | grep HuaceAPIRunner`

---

## Learning Resources

### Project Documentation
- `/README.md` - User guide and quick start
- `/AGENTS.md` - Development conventions and workflows
- `/engines/api-engine/README.md` - API engine usage

### Key Files to Understand
1. `frontend/src/api/client.ts` - API architecture
2. `backend/app/main.py` - Backend initialization
3. `backend/app/api/v1/api.py` - Route structure
4. `frontend/src/config/index.ts` - Frontend configuration
5. `backend/app/core/config.py` - Backend settings

### External Documentation
- [FastAPI](https://fastapi.tiangolo.com/)
- [React Query](https://tanstack.com/query/latest)
- [ReactFlow](https://reactflow.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [SQLModel](https://sqlmodel.tiangolo.com/)

---

## Important Notes

- **Database Models**: Use SQLModel (combines SQLAlchemy + Pydantic)
- **Async Operations**: All database operations must be async/await
- **API Versioning**: All routes prefixed with `/api/v1`
- **Authentication**: JWT-based, can be disabled for development
- **State Management**: React Query for server state, Context for global state
- **Styling**: Tailwind CSS with `cn()` utility for class merging
- **Type Safety**: Strict TypeScript on frontend, type hints on backend
- **i18n**: All user-facing strings must use translation keys
- **Error Handling**: Centralized error handling in API client
- **File Uploads**: MinIO for object storage (configured in backend)

---

## Quick Commands Reference

```bash
# Start everything
docker compose up -d                    # Infrastructure
conda activate platform-auto            # Python env
cd backend && uvicorn app.main:app --reload &  # Backend
cd frontend && npm run dev              # Frontend

# Database operations
cd backend
alembic revision --autogenerate -m "message"
alembic upgrade head
alembic downgrade -1

# Testing
cd engines/api-engine
huace-apirun --cases=examples/ -sv

# Linting
cd frontend
npm run lint

# Build
cd frontend && npm run build
```

---

## Summary

SisyphusX is a modern, full-stack automated testing platform that separates concerns between:
- **Frontend**: Visual interface for test management
- **Backend**: API and data persistence
- **Engines**: Test execution logic

The project uses industry-standard technologies and follows best practices for type safety, async operations, and component reusability. The modular architecture allows independent development and testing of each component.

**Remember:** Always refer to AGENTS.md for detailed coding conventions and this file (CLAUDE.md) for AI assistant-specific guidance.
