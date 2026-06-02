# 🏥 UT-RIS — Radiology Information System
**Capstone Project — Sistem Informasi, Universitas Terbuka**

---

## 📋 Deskripsi

UT-RIS adalah sistem informasi radiologi modern yang dibangun sebagai proyek capstone untuk program Sistem Informasi Universitas Terbuka. Sistem ini mengelola alur kerja radiologi mulai dari pendaftaran pasien, penjadwalan pemeriksaan, manajemen hasil radiologi, hingga pelaporan.

---

## 🛠️ Tech Stack

| Layer      | Teknologi                              |
|------------|----------------------------------------|
| Frontend   | React 18, Vite, TailwindCSS, React Router v6 |
| Backend    | FastAPI (Python 3.11+), SQLAlchemy, Alembic |
| Database   | PostgreSQL 15                          |
| Auth       | JWT (python-jose)                      |
| Container  | Docker, Docker Compose                 |

---

## 📁 Struktur Project

```
UT-RIS_Capstone/
├── frontend/                   # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── assets/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/
│   │   │   └── layout/
│   │   ├── features/           # Feature-based modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── patients/
│   │   │   ├── examinations/
│   │   │   └── reports/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities & helpers
│   │   ├── pages/              # Route-level pages
│   │   ├── routes/             # Routing configuration
│   │   ├── services/           # API service layer
│   │   └── store/              # State management
│   └── ...
│
├── backend/                    # FastAPI Clean Architecture
│   ├── app/
│   │   ├── api/                # Route handlers (controllers)
│   │   │   └── v1/
│   │   ├── core/               # Config, security, dependencies
│   │   ├── db/                 # Database setup & migrations
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic schemas (DTOs)
│   │   ├── services/           # Business logic layer
│   │   └── repositories/       # Data access layer
│   ├── alembic/                # Database migrations
│   ├── tests/
│   └── ...
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Cara Menjalankan

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15 (atau Docker)
- Docker & Docker Compose (opsional)

### 1. Menggunakan Docker (Direkomendasikan)

```bash
# Clone repository
git clone <repo-url>
cd UT-RIS_Capstone

# Jalankan semua service
docker-compose up -d

# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### 2. Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt

# Setup environment variables
copy .env.example .env
# Edit .env sesuai konfigurasi database

# Jalankan migrasi
alembic upgrade head

# Jalankan server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install

# Setup environment variables
copy .env.example .env

# Jalankan development server
npm run dev
```

---

## 🔑 Default Credentials (Development)

| Role     | Username | Password   |
|----------|----------|------------|
| Admin    | admin    | admin123   |
| Dokter   | dokter1  | dokter123  |
| Radiolog | rad1     | rad123     |

---

## 📡 API Endpoints

Dokumentasi API tersedia di: `http://localhost:8000/docs` (Swagger UI)

| Method | Endpoint                    | Deskripsi              |
|--------|-----------------------------|------------------------|
| POST   | /api/v1/auth/login          | Login user             |
| POST   | /api/v1/auth/logout         | Logout user            |
| GET    | /api/v1/users/me            | Get current user       |
| GET    | /api/v1/patients            | List pasien            |
| POST   | /api/v1/patients            | Tambah pasien          |
| GET    | /api/v1/examinations        | List pemeriksaan       |
| POST   | /api/v1/examinations        | Buat pemeriksaan baru  |
| GET    | /api/v1/reports             | List laporan radiologi |

---

## 👥 Tim Pengembang

- **Nama Mahasiswa** — NIM — Universitas Terbuka

---

## 📄 Lisensi

Project ini dibuat untuk keperluan akademik Universitas Terbuka.
"# ut-ris-capstone" 
