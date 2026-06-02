# 📚 Dokumentasi UT-RIS — Radiology Information System
**Capstone Project — Sistem Informasi, Universitas Terbuka**

---

## Daftar Dokumen

| No | Dokumen | Deskripsi |
|----|---------|-----------|
| 01 | [Arsitektur Sistem](./01_ARSITEKTUR_SISTEM.md) | Gambaran umum arsitektur, tech stack, dan struktur folder |
| 02 | [ERD & Database Schema](./02_ERD_DATABASE.md) | Entity Relationship Diagram dan skema PostgreSQL |
| 03 | [Alur Kerja (Workflow)](./03_WORKFLOW.md) | Business workflow: pendaftaran pasien, pemeriksaan, pelaporan |
| 04 | [Autentikasi & RBAC](./04_AUTENTIKASI_RBAC.md) | JWT authentication dan role-based access control |
| 05 | [API Reference](./05_API_REFERENCE.md) | Dokumentasi lengkap semua endpoint REST API |
| 06 | [Backend — Panduan Kode](./06_BACKEND_CODE_GUIDE.md) | Penjelasan kode backend: models, services, repositories |
| 07 | [Frontend — Panduan Kode](./07_FRONTEND_CODE_GUIDE.md) | Penjelasan kode frontend: komponen, store, routing |
| 08 | [Panduan Setup & Deployment](./08_SETUP_DEPLOYMENT.md) | Cara menjalankan project secara lokal dan dengan Docker |
| 09 | [Panduan Testing](./09_TESTING.md) | Cara menjalankan test dan penjelasan test suite |
| 10 | [Keputusan Desain](./10_KEPUTUSAN_DESAIN.md) | Alasan di balik pilihan teknologi dan arsitektur |

---

## Ringkasan Project

**UT-RIS** adalah sistem informasi radiologi yang mengelola alur kerja:

```
Pendaftaran Pasien → Penjadwalan → Pemeriksaan → Pelaporan
```

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, React Router v6, Zustand, TanStack Query |
| Backend | FastAPI (Python 3.11), SQLAlchemy 2.0 (async), Alembic |
| Database | PostgreSQL 15 |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Container | Docker, Docker Compose |

### Akses Cepat

- **API Docs (Swagger)**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173
- **Health Check**: http://localhost:8000/health
