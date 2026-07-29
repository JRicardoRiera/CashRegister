# CashRegister — Agent Guide

## Stack
- **Frontend:** React 19 + Vite 8 + Tailwind CSS 4 + Zustand + React Router v7 + Supabase JS
- **Backend:** Python 3.11+ / FastAPI + Pydantic v2 + Supabase Python client
- **Database:** PostgreSQL 15+ on Supabase (Auth + RLS)

## Dev commands
```bash
# Frontend (in frontend/)
npm run dev      # vite dev server
npm run build    # vite build
npm run preview  # vite preview
npm run lint     # oxlint (not ESLint)

# Backend (in backend/, after pip install -r requirements.txt)
uvicorn app.main:app --reload
```

## Environment
Copy `.env.example` to `.env` and fill Supabase credentials. Backend loads via pydantic-settings from `.env`. Frontend uses `VITE_SUPABASE_*` vars.

## Architecture
`frontend/` — React SPA (no SSR, no TypeScript — plain JSX).  
`backend/app/` — FastAPI REST API, currently scaffold with `/api/v1/health` only.  
`database/` — DDL script for Supabase SQL Editor (`01_ddl_unificado.sql`).  
`*.md` docs contain the spec but code is the source of truth.

## Conventions
- Business entity naming in Spanish: `productos`, `ventas`, `perfiles`, `categorias`, `detalle_ventas`.
- Database: snake_case, plural table names, `NUMERIC(12,2)` for money, `TIMESTAMPTZ` for timestamps, UUID PKs for users, BIGINT IDENTITY for business tables.
- State management: Zustand (not React Context) for reactive cart state.
- Styling: Tailwind CSS v4 (`@import "tailwindcss"` in index.css, no config file needed).
- Linting: oxlint with React plugin (config in `.oxlintrc.json`).

## Auth flow
OAuth 2.0 (Google/Microsoft) via Supabase Auth. Frontend creates Supabase JS client in `frontend/src/lib/supabase.js`. Backend validates JWT. Roles: `administrador` / `cajero` (default on signup).
