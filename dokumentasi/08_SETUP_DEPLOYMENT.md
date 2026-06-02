# 08 — Panduan Setup & Deployment

## Prerequisites

| Tool | Versi Minimum | Cek |
|------|:---:|-----|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| PostgreSQL | 15+ | `psql --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | 2.x | `docker compose version` |

---

## Opsi 1: Docker (Direkomendasikan)

Cara paling mudah — semua service berjalan dalam container.

```bash
# 1. Clone repository
git clone <repo-url>
cd UT-RIS_Capstone

# 2. Buat file environment (opsional — ada default values)
copy docker-compose.yml docker-compose.override.yml

# 3. Jalankan semua service
docker compose up -d

# 4. Cek status
docker compose ps

# 5. Lihat logs
docker compose logs -f backend
docker compose logs -f frontend
```

**Service yang berjalan:**

| Service | URL | Keterangan |
|---------|-----|------------|
| Frontend | http://localhost:5173 | React app |
| Backend API | http://localhost:8000 | FastAPI |
| API Docs | http://localhost:8000/docs | Swagger UI |
| PostgreSQL | localhost:5432 | Database |

```bash
# Stop semua service
docker compose down

# Stop dan hapus data (database)
docker compose down -v
```

---

## Opsi 2: Manual Setup

### A. Setup Database PostgreSQL

```sql
-- Buat database dan user
CREATE USER ris_user WITH PASSWORD 'ris_password';
CREATE DATABASE ris_db OWNER ris_user;
GRANT ALL PRIVILEGES ON DATABASE ris_db TO ris_user;
```

### B. Setup Backend

```bash
cd backend

# 1. Buat virtual environment
python -m venv venv

# 2. Aktifkan virtual environment
venv\Scripts\activate          # Windows CMD
# source venv/bin/activate     # Linux/Mac

# 3. Install dependencies
pip install -r requirements.txt

# 4. Buat file .env
copy .env.example .env
```

Edit `.env`:
```env
APP_NAME="UT-RIS Radiology Information System"
ENVIRONMENT=development
DEBUG=true

DATABASE_URL=postgresql://ris_user:ris_password@localhost:5432/ris_db

# Generate dengan: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

CORS_ORIGINS=http://localhost:5173
```

```bash
# 5. Jalankan migrasi database
alembic upgrade head

# 6. Jalankan server development
uvicorn app.main:app --reload --port 8000

# Server berjalan di: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### C. Setup Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Buat file .env
copy .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME="UT-RIS"
```

```bash
# 3. Jalankan development server
npm run dev

# Frontend berjalan di: http://localhost:5173
```

---

## Seed Data Default

Setelah migrasi, buat user default dengan menjalankan SQL seed:

```bash
# Menggunakan psql
psql -U ris_user -d ris_db -f backend/db/schema.sql

# Atau jalankan bagian SEED DATA saja
psql -U ris_user -d ris_db
```

```sql
-- Atau insert manual (password: admin123 untuk semua)
INSERT INTO users (username, email, full_name, hashed_password, role) VALUES
('admin',  'admin@ut-ris.ac.id',  'Administrator Sistem',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'admin'),
('dokter1','dokter1@ut-ris.ac.id','Dr. Budi Santoso, Sp.Rad','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'dokter'),
('rad1',   'rad1@ut-ris.ac.id',   'Dr. Siti Rahayu, Sp.Rad', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'radiolog'),
('resep1', 'resep1@ut-ris.ac.id', 'Ahmad Fauzi',             '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', 'resepsionis');
```

**Akun default (password: `admin123`):**

| Username | Role | Email |
|----------|------|-------|
| admin | Administrator | admin@ut-ris.ac.id |
| dokter1 | Dokter | dokter1@ut-ris.ac.id |
| rad1 | Radiolog | rad1@ut-ris.ac.id |
| resep1 | Resepsionis | resep1@ut-ris.ac.id |

> ⚠️ **Ganti semua password sebelum deploy ke production!**

---

## Environment Variables Lengkap

### Backend (.env)

```env
# ─── Application ──────────────────────────────────────────────────────
APP_NAME="UT-RIS Radiology Information System"
APP_VERSION="1.0.0"
ENVIRONMENT=development          # development | production
DEBUG=true                       # false di production

# ─── Database ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://ris_user:ris_password@localhost:5432/ris_db

# ─── Security ─────────────────────────────────────────────────────────
# Generate: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-very-long-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ─── CORS ─────────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME="UT-RIS"
```

---

## Build untuk Production

### Backend
```bash
# Tidak perlu build — uvicorn langsung serve
# Untuk production, gunakan gunicorn + uvicorn workers:
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend
```bash
cd frontend
npm run build
# Output di: frontend/dist/

# Preview build
npm run preview
```

---

## Troubleshooting

### Backend tidak bisa connect ke database
```bash
# Cek apakah PostgreSQL berjalan
pg_isready -h localhost -p 5432

# Cek koneksi manual
psql -U ris_user -d ris_db -h localhost
```

### Alembic migration error
```bash
# Lihat migration yang sudah diaplikasikan
alembic current

# Reset ke awal (HATI-HATI: hapus semua data)
alembic downgrade base
alembic upgrade head
```

### Frontend tidak bisa akses API (CORS error)
Pastikan `CORS_ORIGINS` di backend `.env` sudah include URL frontend:
```env
CORS_ORIGINS=http://localhost:5173
```

### Token expired terus
Cek `ACCESS_TOKEN_EXPIRE_MINUTES` di `.env`. Default 30 menit.
Silent refresh seharusnya menangani ini secara otomatis.

### Port sudah digunakan
```bash
# Cek port yang digunakan
netstat -ano | findstr :8000   # Windows
lsof -i :8000                  # Linux/Mac

# Kill process
taskkill /PID <pid> /F         # Windows
kill -9 <pid>                  # Linux/Mac
```
