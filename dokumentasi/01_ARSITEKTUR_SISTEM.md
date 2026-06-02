# 01 — Arsitektur Sistem

## Gambaran Umum

UT-RIS menggunakan arsitektur **three-tier** yang memisahkan presentasi, logika bisnis, dan data secara tegas.

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│              React 18 + Vite + TailwindCSS                  │
│         (SPA — Single Page Application)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST (JSON)
                       │ Bearer Token (JWT)
┌──────────────────────▼──────────────────────────────────────┐
│                    BACKEND API                              │
│              FastAPI (Python 3.11)                          │
│         Clean Architecture: API → Service → Repository      │
└──────────────────────┬──────────────────────────────────────┘
                       │ asyncpg (async)
┌──────────────────────▼──────────────────────────────────────┐
│                     DATABASE                                │
│                  PostgreSQL 15                              │
│         5 tabel: users, patients, appointments,             │
│                  studies, reports                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Struktur Folder Lengkap

```
UT-RIS_Capstone/
│
├── dokumentasi/                    ← Semua dokumentasi project
│   ├── 00_INDEX.md
│   ├── 01_ARSITEKTUR_SISTEM.md
│   └── ...
│
├── frontend/                       ← React + Vite + TailwindCSS
│   ├── src/
│   │   ├── App.tsx                 ← Root component (BrowserRouter)
│   │   ├── main.tsx                ← Entry point (React Query provider)
│   │   ├── index.css               ← Global styles + Tailwind directives
│   │   │
│   │   ├── routes/
│   │   │   └── AppRoutes.tsx       ← Route definitions + guards
│   │   │
│   │   ├── store/
│   │   │   └── authStore.ts        ← Zustand auth state + permission matrix
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts              ← Axios instance + interceptors
│   │   │   ├── authService.ts      ← Auth API calls
│   │   │   └── dashboardService.ts ← Dashboard API calls
│   │   │
│   │   ├── hooks/
│   │   │   └── useAuth.ts          ← Convenience auth hook
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx  ← Sidebar + Header + Outlet
│   │   │   │   ├── AuthLayout.tsx  ← Login page wrapper
│   │   │   │   ├── Sidebar.tsx     ← Role-filtered navigation
│   │   │   │   └── Header.tsx      ← Top bar
│   │   │   └── common/
│   │   │       ├── StatCard.tsx    ← Dashboard stat card
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── ProtectedContent.tsx ← RBAC conditional render
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PatientsPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   │
│   │   └── lib/
│   │       └── utils.ts            ← cn(), formatDate(), formatNumber()
│   │
│   ├── index.html
│   ├── vite.config.ts              ← Vite config + API proxy
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── backend/                        ← FastAPI Clean Architecture
│   ├── app/
│   │   ├── main.py                 ← App factory (CORS, middleware, routers)
│   │   │
│   │   ├── core/
│   │   │   ├── config.py           ← Settings (pydantic-settings)
│   │   │   ├── security.py         ← JWT + bcrypt + token blacklist
│   │   │   ├── dependencies.py     ← get_db, get_current_user
│   │   │   └── permissions.py      ← RBAC matrix + dependency factories
│   │   │
│   │   ├── db/
│   │   │   ├── base.py             ← DeclarativeBase + model registry
│   │   │   └── session.py          ← Async engine + session factory
│   │   │
│   │   ├── models/
│   │   │   ├── base_model.py       ← TimestampMixin
│   │   │   ├── user.py             ← User + UserRole enum
│   │   │   ├── patient.py          ← Patient + Gender enum
│   │   │   ├── appointment.py      ← Appointment + status/priority enums
│   │   │   ├── study.py            ← Study + Modality + StudyStatus enums
│   │   │   └── report.py           ← Report + ReportStatus + ReportPriority enums
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.py             ← Login/Token/Refresh Pydantic schemas
│   │   │   ├── user.py             ← UserCreate/Update/Response schemas
│   │   │   └── patient.py          ← PatientCreate/Update/Response schemas
│   │   │
│   │   ├── repositories/
│   │   │   ├── base_repository.py  ← Generic CRUD (get, create, update, delete)
│   │   │   ├── user_repository.py  ← get_by_username, get_by_email
│   │   │   └── patient_repository.py ← search, generate_mrn
│   │   │
│   │   ├── services/
│   │   │   ├── auth_service.py     ← login, logout, refresh, change_password
│   │   │   ├── user_service.py     ← CRUD users (admin only)
│   │   │   └── patient_service.py  ← CRUD patients
│   │   │
│   │   └── api/
│   │       └── v1/
│   │           ├── router.py       ← Aggregates all routers
│   │           └── endpoints/
│   │               ├── auth.py     ← /auth/*
│   │               ├── users.py    ← /users/*
│   │               ├── patients.py ← /patients/*
│   │               └── dashboard.py ← /dashboard/*
│   │
│   ├── alembic/
│   │   ├── env.py                  ← Async migration config
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   │
│   ├── db/
│   │   └── schema.sql              ← Raw PostgreSQL DDL (referensi)
│   │
│   ├── tests/
│   │   ├── conftest.py             ← Fixtures (SQLite in-memory)
│   │   ├── test_health.py
│   │   ├── test_auth.py
│   │   └── test_rbac.py
│   │
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── Dockerfile
│   └── .env.example
│
├── docs/
│   └── ERD.md                      ← ERD diagram (Mermaid)
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Pola Arsitektur Backend

Backend mengikuti **Clean Architecture** dengan 4 lapisan:

```
HTTP Request
     │
     ▼
┌─────────────┐
│  API Layer  │  endpoints/*.py — hanya routing & validasi input
│  (Router)   │  Tidak ada logika bisnis di sini
└──────┬──────┘
       │ memanggil
       ▼
┌─────────────┐
│  Service    │  services/*.py — semua logika bisnis
│  Layer      │  Validasi, kalkulasi, aturan domain
└──────┬──────┘
       │ memanggil
       ▼
┌─────────────┐
│ Repository  │  repositories/*.py — hanya akses database
│  Layer      │  Query SQL via SQLAlchemy ORM
└──────┬──────┘
       │ menggunakan
       ▼
┌─────────────┐
│   Models    │  models/*.py — definisi tabel ORM
│  (ORM)      │  Tidak ada logika bisnis
└─────────────┘
```

**Keuntungan pola ini:**
- Setiap lapisan bisa ditest secara independen
- Mudah mengganti database (cukup ubah repository)
- Logika bisnis tidak tersebar di mana-mana

---

## Pola Arsitektur Frontend

```
Browser
  │
  ├── App.tsx (BrowserRouter)
  │     └── AppRoutes.tsx
  │           ├── PublicRoute → AuthLayout → LoginPage
  │           └── PrivateRoute → MainLayout
  │                 ├── Sidebar (role-filtered nav)
  │                 ├── Header
  │                 └── <Outlet> (halaman aktif)
  │
  ├── State Management
  │     └── Zustand (authStore) — persisted to localStorage
  │
  ├── Server State
  │     └── TanStack Query — caching, refetch, loading states
  │
  └── API Layer
        └── Axios (api.ts) — interceptors untuk auth + silent refresh
```
