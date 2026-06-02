# 05 — API Reference

**Base URL**: `http://localhost:8000/api/v1`  
**Dokumentasi Interaktif**: http://localhost:8000/docs (Swagger UI)  
**Format**: JSON  
**Auth**: Bearer Token (JWT)

---

## Autentikasi

Semua endpoint kecuali `POST /auth/login` memerlukan header:
```
Authorization: Bearer <access_token>
```

---

## 🔐 Auth Endpoints

### POST /auth/login
Login dan dapatkan token pair.

**Request** (form-encoded):
```
username=admin&password=admin123
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Administrator Sistem",
    "role": "admin",
    "is_active": true
  }
}
```

**Response 401:**
```json
{ "detail": "Username atau password salah" }
```

---

### POST /auth/refresh
Perbarui access token menggunakan refresh token.

**Request:**
```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

### POST /auth/logout
🔒 Requires: any authenticated user

Revoke refresh token (blacklist JTI).

**Request:**
```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Response 200:**
```json
{ "message": "Logout berhasil. Silakan hapus token dari client." }
```

---

### POST /auth/change-password
🔒 Requires: any authenticated user

**Request:**
```json
{
  "current_password": "password123",
  "new_password": "newpassword456"
}
```

**Response 200:**
```json
{ "message": "Password berhasil diubah" }
```

**Response 400:**
```json
{ "detail": "Password saat ini tidak sesuai" }
```

---

### GET /auth/me
🔒 Requires: any authenticated user

**Response 200:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@ut-ris.ac.id",
  "full_name": "Administrator Sistem",
  "role": "admin",
  "is_active": true,
  "created_at": "2026-05-08T10:00:00Z",
  "updated_at": "2026-05-08T10:00:00Z"
}
```

---

## 👥 User Endpoints

> Semua endpoint `/users` hanya dapat diakses oleh **admin**.

### GET /users
🔒 Requires: `admin`

**Query params:**
- `page` (int, default: 1)
- `size` (int, default: 20, max: 100)

**Response 200:**
```json
{
  "items": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@ut-ris.ac.id",
      "full_name": "Administrator Sistem",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-05-08T10:00:00Z",
      "updated_at": "2026-05-08T10:00:00Z"
    }
  ],
  "total": 4,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

---

### POST /users
🔒 Requires: `admin`

**Request:**
```json
{
  "username": "rad2",
  "email": "rad2@ut-ris.ac.id",
  "full_name": "Dr. Ahmad Radiolog",
  "role": "radiolog",
  "password": "password123"
}
```

**Response 201:** UserResponse object

**Response 409:**
```json
{ "detail": "Username 'rad2' sudah digunakan" }
```

---

### GET /users/{user_id}
🔒 Requires: `admin`

**Response 200:** UserResponse object  
**Response 404:** `{ "detail": "User dengan ID 99 tidak ditemukan" }`

---

### PATCH /users/{user_id}
🔒 Requires: `admin`

**Request** (semua field opsional):
```json
{
  "full_name": "Dr. Ahmad Radiolog, Sp.Rad",
  "role": "radiolog",
  "is_active": true
}
```

**Response 200:** UserResponse object

---

### DELETE /users/{user_id}
🔒 Requires: `admin`

**Response 204:** No content  
**Response 400:** `{ "detail": "Tidak dapat menghapus akun sendiri" }`

---

### POST /users/{user_id}/toggle-active
🔒 Requires: `admin`

Toggle status aktif/nonaktif pengguna.

**Response 200:** UserResponse object dengan `is_active` yang sudah diubah

---

## 🏥 Patient Endpoints

### GET /patients
🔒 Requires: `patients:read` (semua role)

**Query params:**
- `page` (int, default: 1)
- `size` (int, default: 20, max: 100)

**Response 200:**
```json
{
  "items": [
    {
      "id": 1,
      "medical_record_number": "MRN000001",
      "full_name": "Budi Santoso",
      "nik": "3201234567890001",
      "date_of_birth": "1985-03-15",
      "gender": "L",
      "phone_number": "081234567890",
      "address": "Jl. Merdeka No. 1, Jakarta",
      "blood_type": "O",
      "allergies": null,
      "created_at": "2026-05-08T10:00:00Z",
      "updated_at": "2026-05-08T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "size": 20,
  "pages": 8
}
```

---

### POST /patients
🔒 Requires: `patients:create` (admin, resepsionis)

**Request:**
```json
{
  "full_name": "Siti Rahayu",
  "date_of_birth": "1990-07-22",
  "gender": "P",
  "nik": "3201234567890002",
  "phone_number": "082345678901",
  "address": "Jl. Sudirman No. 5, Jakarta",
  "blood_type": "A",
  "allergies": "Penisilin"
}
```

**Response 201:** PatientResponse object  
MRN di-generate otomatis oleh sistem.

---

### GET /patients/{patient_id}
🔒 Requires: `patients:read` (semua role)

**Response 200:** PatientResponse object  
**Response 404:** `{ "detail": "Pasien dengan ID 99 tidak ditemukan" }`

---

### PATCH /patients/{patient_id}
🔒 Requires: `patients:update` (admin, resepsionis)

**Request** (semua field opsional):
```json
{
  "phone_number": "083456789012",
  "address": "Jl. Thamrin No. 10, Jakarta",
  "allergies": "Penisilin, Aspirin"
}
```

**Response 200:** PatientResponse object

---

### DELETE /patients/{patient_id}
🔒 Requires: `patients:delete` (admin only)

**Response 204:** No content

---

## 📊 Dashboard Endpoints

### GET /dashboard/stats
🔒 Requires: `dashboard:read` (semua role)

**Response 200:**
```json
{
  "total_patients": 150,
  "total_examinations_today": 12,
  "pending_reports": 5,
  "completed_today": 8
}
```

---

## ❌ Error Responses

| Status | Kondisi |
|--------|---------|
| 400 | Request tidak valid (validasi gagal) |
| 401 | Token tidak ada, expired, atau invalid |
| 403 | Token valid tapi tidak punya izin |
| 404 | Resource tidak ditemukan |
| 409 | Conflict (username/email sudah ada) |
| 422 | Unprocessable Entity (format data salah) |
| 500 | Internal server error |

**Format error standar:**
```json
{
  "detail": "Pesan error dalam Bahasa Indonesia"
}
```

**Format error validasi (422):**
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "full_name"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

---

## Health Endpoints

### GET /
```json
{
  "app": "UT-RIS Radiology Information System",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs"
}
```

### GET /health
```json
{ "status": "healthy" }
```

---

## Contoh Request dengan curl

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin&password=admin123"

# Simpan token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get profil
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Daftar pasien
curl "http://localhost:8000/api/v1/patients?page=1&size=10" \
  -H "Authorization: Bearer $TOKEN"

# Buat pasien baru
curl -X POST http://localhost:8000/api/v1/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test Pasien","date_of_birth":"1990-01-01","gender":"L"}'
```
