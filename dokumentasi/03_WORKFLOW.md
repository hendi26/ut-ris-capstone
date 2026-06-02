# 03 — Alur Kerja (Workflow)

## Alur Utama Sistem RIS

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  RESEPSIONIS │    │    DOKTER    │    │   RADIOLOG   │    │    PASIEN    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │                   │
       │ 1. Daftarkan      │                   │                   │
       │    Pasien         │                   │                   │
       │◄──────────────────┼───────────────────┼───────────────────┤
       │                   │                   │                   │
       │ 2. Buat Jadwal    │                   │                   │
       │◄──────────────────┤                   │                   │
       │   (atas rujukan   │                   │                   │
       │    dokter)        │                   │                   │
       │                   │                   │                   │
       │ 3. Konfirmasi     │                   │                   │
       │    Jadwal         │                   │                   │
       │                   │                   │                   │
       │ 4. Check-in       │                   │                   │
       │    Pasien         │                   │                   │
       │                   │                   │                   │
       │ 5. Buat Study     │                   │                   │
       │──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ 6. Lakukan        │                   │
       │                   │    Pemeriksaan    │                   │
       │                   │──────────────────►│                   │
       │                   │                   │                   │
       │                   │                   │ 7. Tulis Laporan  │
       │                   │                   │                   │
       │                   │                   │ 8. Finalisasi     │
       │                   │                   │    Laporan        │
       │                   │                   │                   │
       │                   │ 9. Baca Laporan   │                   │
       │                   │◄──────────────────┤                   │
       │                   │                   │                   │
```

---

## 1. Alur Pendaftaran Pasien

```
Resepsionis membuka halaman Pasien
         │
         ▼
Klik "Daftarkan Pasien"
         │
         ▼
Isi form: nama, NIK, tanggal lahir, jenis kelamin, dll.
         │
         ▼
POST /api/v1/patients
         │
         ▼
Sistem generate Nomor Rekam Medis (MRN) otomatis
Format: MRN000001, MRN000002, dst.
         │
         ▼
Pasien tersimpan di database
         │
         ▼
Resepsionis menerima konfirmasi + MRN
```

**Kode — Generate MRN (patient_repository.py):**
```python
async def generate_mrn(self) -> str:
    """Generate nomor rekam medis unik secara otomatis."""
    result = await self.db.execute(
        select(func.count()).select_from(Patient)
    )
    count = result.scalar_one()
    return f"MRN{str(count + 1).zfill(6)}"
    # Contoh output: MRN000001, MRN000042, MRN001337
```

---

## 2. Alur Penjadwalan Pemeriksaan

```
Dokter memilih pasien
         │
         ▼
Dokter membuat Appointment
POST /api/v1/appointments
Body: {
  patient_id, requested_modality, body_part,
  clinical_indication, scheduled_datetime, priority
}
         │
         ▼
Status: PENDING
         │
         ▼
Resepsionis mengkonfirmasi jadwal
PATCH /api/v1/appointments/{id}
Body: { status: "confirmed" }
         │
         ▼
Status: CONFIRMED
         │
         ▼
Pasien datang → Resepsionis check-in
PATCH /api/v1/appointments/{id}
Body: { status: "checked_in", checked_in_at: "2026-05-08T09:00:00Z" }
         │
         ▼
Status: CHECKED_IN
```

**Status Transitions Appointment:**
```
PENDING ──► CONFIRMED ──► CHECKED_IN ──► COMPLETED
   │                                         ▲
   └──► CANCELLED                            │
                                    (setelah Study dibuat)
   CONFIRMED ──► NO_SHOW (jika pasien tidak datang)
```

---

## 3. Alur Pemeriksaan Radiologi (Study)

```
Radiolog menerima pasien yang sudah check-in
         │
         ▼
Radiolog membuat Study
POST /api/v1/studies
Body: {
  patient_id, appointment_id, modality,
  body_part, procedure_description
}
         │
         ▼
Status Study: SCHEDULED
         │
         ▼
Radiolog memulai pemeriksaan
PATCH /api/v1/studies/{id}
Body: { status: "in_progress", started_at: "..." }
         │
         ▼
Status Study: IN_PROGRESS
         │
         ▼
Pemeriksaan selesai
PATCH /api/v1/studies/{id}
Body: { status: "completed", completed_at: "..." }
         │
         ▼
Status Study: COMPLETED
         │
         ▼
Appointment otomatis → COMPLETED
```

**Status Transitions Study:**
```
SCHEDULED ──► IN_PROGRESS ──► COMPLETED ──► REPORTED
    │                              │
    └──► CANCELLED                 └──► CANCELLED (jarang)
```

---

## 4. Alur Pelaporan Radiologi (Report)

```
Radiolog membuka Study yang sudah COMPLETED
         │
         ▼
Radiolog membuat laporan
POST /api/v1/reports
Body: {
  study_id, findings, impression,
  technique, recommendation, priority
}
         │
         ▼
Status Report: DRAFT
drafted_at: timestamp sekarang
         │
         ▼
Radiolog melengkapi dan submit untuk review
PATCH /api/v1/reports/{id}
Body: { status: "pending_review" }
         │
         ▼
Status Report: PENDING_REVIEW
         │
         ▼
Radiolog Senior memverifikasi
PATCH /api/v1/reports/{id}
Body: { status: "finalized", verified_by_id: <id_senior> }
         │
         ▼
Status Report: FINALIZED
finalized_at: timestamp sekarang
         │
         ▼
Study otomatis → REPORTED
         │
         ▼
Dokter dapat membaca laporan
GET /api/v1/reports/{id}
```

**Status Transitions Report:**
```
DRAFT ──► PENDING_REVIEW ──► FINALIZED
                                  │
                                  └──► AMENDED (jika ada koreksi)
                                            │
                                            └──► FINALIZED (kembali)
```

**Constraint Verifikasi:**
```python
# Di model Report — verifikator tidak boleh sama dengan penulis
CONSTRAINT chk_reports_verifier
    CHECK (verified_by_id IS NULL OR verified_by_id != radiologist_id)
```

---

## 5. Alur Autentikasi

```
User membuka aplikasi
         │
         ▼
Belum login? → Redirect ke /login
         │
         ▼
User isi username + password
         │
         ▼
POST /api/v1/auth/login
         │
         ├── Gagal → Tampilkan error "Username atau password salah"
         │           (pesan generik — mencegah username enumeration)
         │
         └── Berhasil → Terima:
                         {
                           access_token,   ← valid 30 menit
                           refresh_token,  ← valid 7 hari
                           expires_in,
                           user: { id, username, full_name, role }
                         }
                              │
                              ▼
                        Simpan ke localStorage (Zustand persist)
                              │
                              ▼
                        Redirect ke /dashboard
```

**Silent Token Refresh (api.ts):**
```
Request API dengan access token
         │
         ▼
Server mengembalikan 401 (token expired)
         │
         ▼
Interceptor Axios mendeteksi 401
         │
         ▼
POST /api/v1/auth/refresh dengan refresh_token
         │
         ├── Gagal → clearAuth() + redirect /login
         │
         └── Berhasil → Simpan access_token baru
                              │
                              ▼
                        Retry request original
                        (transparan untuk user)
```

---

## 6. Alur RBAC (Role-Based Access Control)

```
Request masuk ke endpoint
         │
         ▼
Middleware: Ambil Bearer token dari header
         │
         ▼
decode_token() → validasi signature + expiry
         │
         ▼
Cek token type == "access" (bukan refresh)
         │
         ▼
Cek JTI tidak ada di blacklist (sudah logout?)
         │
         ▼
Load user dari database berdasarkan sub (user ID)
         │
         ▼
Cek user.is_active == True
         │
         ▼
require_permission("patients:create") dipanggil
         │
         ▼
Cek ROLE_PERMISSIONS[user.role] contains "patients:create"
         │
         ├── Tidak ada → HTTP 403 Forbidden
         │               "Akses ditolak. Diperlukan izin: 'patients:create'"
         │
         └── Ada → Lanjutkan ke handler
```

---

## Ringkasan Status Transitions

### Appointment
| Dari | Ke | Siapa |
|------|----|-------|
| `pending` | `confirmed` | Resepsionis |
| `pending` | `cancelled` | Resepsionis / Dokter |
| `confirmed` | `checked_in` | Resepsionis |
| `confirmed` | `no_show` | Resepsionis |
| `checked_in` | `completed` | Sistem (otomatis saat Study dibuat) |

### Study
| Dari | Ke | Siapa |
|------|----|-------|
| `scheduled` | `in_progress` | Radiolog |
| `in_progress` | `completed` | Radiolog |
| `completed` | `reported` | Sistem (otomatis saat Report difinalisasi) |
| `*` | `cancelled` | Radiolog / Admin |

### Report
| Dari | Ke | Siapa |
|------|----|-------|
| `draft` | `pending_review` | Radiolog |
| `pending_review` | `finalized` | Radiolog Senior |
| `pending_review` | `draft` | Radiolog (revisi) |
| `finalized` | `amended` | Radiolog Senior |
| `amended` | `finalized` | Radiolog Senior |
