# ERD — UT-RIS Radiology Information System

## Entity Relationship Diagram

```mermaid
erDiagram

    %% ══════════════════════════════════════════════════════
    %% ENTITIES
    %% ══════════════════════════════════════════════════════

    USERS {
        int         id                  PK
        varchar(50) username            UK  "NOT NULL"
        varchar(255) email              UK  "NOT NULL"
        varchar(255) full_name              "NOT NULL"
        varchar(255) hashed_password        "NOT NULL"
        userrole    role                    "admin | dokter | radiolog | resepsionis"
        boolean     is_active               "DEFAULT true"
        timestamptz created_at
        timestamptz updated_at
    }

    PATIENTS {
        int         id                      PK
        varchar(20) medical_record_number   UK  "NOT NULL, format: MRN000001"
        varchar(255) full_name                  "NOT NULL"
        varchar(16) nik                     UK  "nullable"
        date        date_of_birth               "NOT NULL"
        gender      gender                      "L | P"
        varchar(20) phone_number                "nullable"
        text        address                     "nullable"
        varchar(5)  blood_type                  "nullable"
        text        allergies                   "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    APPOINTMENTS {
        int         id                          PK
        varchar(20) appointment_number          UK  "NOT NULL, format: APT-YYYYMMDD-XXXX"
        int         patient_id                  FK  "NOT NULL → patients.id"
        int         referring_doctor_id         FK  "nullable → users.id"
        int         created_by_id               FK  "nullable → users.id"
        varchar(10) requested_modality              "NOT NULL, e.g. CT, MR"
        varchar(100) body_part                      "NOT NULL"
        text        clinical_indication             "nullable"
        text        preparation_instructions        "nullable"
        timestamptz scheduled_datetime              "NOT NULL"
        int         estimated_duration_minutes      "DEFAULT 30"
        appt_status status                          "pending|confirmed|checked_in|completed|cancelled|no_show"
        appt_priority priority                      "routine | urgent | emergency"
        text        notes                           "nullable"
        varchar(500) cancellation_reason            "nullable"
        timestamptz checked_in_at                   "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    STUDIES {
        int         id                          PK
        varchar(64) study_instance_uid          UK  "NOT NULL, DICOM UID"
        varchar(20) accession_number            UK  "NOT NULL, format: STD-YYYYMMDD-XXXXXX"
        int         patient_id                  FK  "NOT NULL → patients.id"
        int         appointment_id              FK  "nullable → appointments.id"
        int         referring_doctor_id         FK  "nullable → users.id"
        int         performing_radiologist_id   FK  "nullable → users.id"
        modality    modality                        "CR|DX|CT|MR|US|MG|NM|PT|XA|RF"
        varchar(100) body_part                      "NOT NULL"
        text        clinical_indication             "nullable"
        varchar(255) procedure_description          "nullable"
        studystatus status                          "scheduled|in_progress|completed|reported|cancelled"
        timestamptz scheduled_at                    "nullable"
        timestamptz started_at                      "nullable"
        timestamptz completed_at                    "nullable"
        text        technician_notes                "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    REPORTS {
        int         id                  PK
        varchar(20) report_number       UK  "NOT NULL, format: RPT-YYYYMMDD-XXXXXX"
        int         study_id            FK  "NOT NULL, UNIQUE → studies.id"
        int         radiologist_id      FK  "NOT NULL → users.id"
        int         verified_by_id      FK  "nullable → users.id, ≠ radiologist_id"
        text        technique               "nullable"
        text        findings                "NOT NULL"
        text        impression              "NOT NULL"
        text        recommendation          "nullable"
        text        internal_notes          "nullable"
        rpt_status  status                  "draft|pending_review|finalized|amended"
        rpt_priority priority               "routine | urgent | stat"
        timestamptz drafted_at              "nullable"
        timestamptz finalized_at            "nullable"
        timestamptz verified_at             "nullable"
        timestamptz amended_at              "nullable"
        varchar(500) amendment_reason       "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    %% ══════════════════════════════════════════════════════
    %% RELATIONSHIPS
    %% ══════════════════════════════════════════════════════

    %% Patient ←→ Appointment  (1 pasien bisa punya banyak jadwal)
    PATIENTS ||--o{ APPOINTMENTS : "memiliki"

    %% Patient ←→ Study  (1 pasien bisa punya banyak pemeriksaan)
    PATIENTS ||--o{ STUDIES : "menjalani"

    %% Appointment ←→ Study  (1 jadwal menghasilkan 0-1 pemeriksaan)
    APPOINTMENTS |o--o| STUDIES : "menghasilkan"

    %% Study ←→ Report  (1 pemeriksaan menghasilkan tepat 1 laporan)
    STUDIES ||--o| REPORTS : "dilaporkan dalam"

    %% User (dokter) → Appointment  (dokter membuat rujukan)
    USERS ||--o{ APPOINTMENTS : "merujuk (referring_doctor)"

    %% User (resepsionis) → Appointment  (resepsionis membuat jadwal)
    USERS ||--o{ APPOINTMENTS : "membuat jadwal (created_by)"

    %% User (dokter) → Study  (dokter yang merujuk)
    USERS ||--o{ STUDIES : "merujuk (referring_doctor)"

    %% User (radiolog) → Study  (radiolog yang melakukan)
    USERS ||--o{ STUDIES : "melakukan (performing_radiologist)"

    %% User (radiolog) → Report  (radiolog yang menulis)
    USERS ||--o{ REPORTS : "menulis (radiologist)"

    %% User (radiolog senior) → Report  (radiolog senior yang verifikasi)
    USERS ||--o{ REPORTS : "memverifikasi (verified_by)"
```

---

## Penjelasan Relasi

### Kardinalitas

| Relasi | Tipe | Keterangan |
|--------|------|------------|
| `patients` → `appointments` | 1 : N | Satu pasien bisa punya banyak jadwal |
| `patients` → `studies` | 1 : N | Satu pasien bisa menjalani banyak pemeriksaan |
| `appointments` → `studies` | 1 : 0..1 | Satu jadwal menghasilkan maks. satu pemeriksaan |
| `studies` → `reports` | 1 : 0..1 | Satu pemeriksaan menghasilkan tepat satu laporan |
| `users` → `appointments` (referring) | 1 : N | Satu dokter bisa merujuk banyak jadwal |
| `users` → `appointments` (created_by) | 1 : N | Satu resepsionis bisa membuat banyak jadwal |
| `users` → `studies` (referring) | 1 : N | Satu dokter bisa merujuk banyak pemeriksaan |
| `users` → `studies` (performing) | 1 : N | Satu radiolog bisa melakukan banyak pemeriksaan |
| `users` → `reports` (author) | 1 : N | Satu radiolog bisa menulis banyak laporan |
| `users` → `reports` (verifier) | 1 : N | Satu radiolog senior bisa verifikasi banyak laporan |

### Catatan Penting

- **`USERS` memiliki 6 FK dari tabel lain** — karena satu user bisa berperan sebagai dokter, radiolog, atau resepsionis tergantung konteks.
- **`appointments.id` → `studies.appointment_id`** bersifat nullable — study bisa dibuat tanpa appointment (walk-in).
- **`reports.study_id`** memiliki constraint `UNIQUE` — menjamin relasi 1-to-1 antara study dan report.
- **`reports.verified_by_id ≠ reports.radiologist_id`** — CHECK constraint mencegah radiolog memverifikasi laporannya sendiri.
- **`ON DELETE RESTRICT`** pada FK kritis (patient→study, study→report) mencegah penghapusan data yang masih direferensikan.
- **`ON DELETE SET NULL`** pada FK opsional (user references) — data tetap ada meski user dihapus.

---

## Alur Kerja Utama

```
Resepsionis          Dokter              Radiolog
     │                  │                   │
     │  Daftarkan Pasien│                   │
     │──────────────────┼───────────────────┤
     │                  │                   │
     │  Buat Appointment│                   │
     │◄─────────────────│                   │
     │                  │                   │
     ▼                  │                   │
APPOINTMENT             │                   │
(status: pending)       │                   │
     │                  │                   │
     │ Konfirmasi        │                   │
     ▼                  │                   │
APPOINTMENT             │                   │
(status: confirmed)     │                   │
     │                  │                   │
     │ Pasien hadir      │                   │
     ▼                  │                   │
APPOINTMENT             │                   │
(status: checked_in)    │                   │
     │                  │                   │
     │ Buat Study        │                   │
     └──────────────────┼──────────────────►│
                        │                   │
                        │              STUDY │
                        │    (status: scheduled)
                        │                   │
                        │         Mulai pemeriksaan
                        │                   ▼
                        │              STUDY
                        │    (status: in_progress)
                        │                   │
                        │         Selesai pemeriksaan
                        │                   ▼
                        │              STUDY
                        │    (status: completed)
                        │                   │
                        │         Tulis laporan
                        │                   ▼
                        │              REPORT
                        │           (status: draft)
                        │                   │
                        │         Finalisasi laporan
                        │                   ▼
                        │              REPORT
                        │        (status: finalized)
                        │                   │
                        │              STUDY
                        │◄──────────────────┤
                        │    (status: reported)
                        │
                   Baca laporan
```

---

## Enum Values

| Enum | Values |
|------|--------|
| `userrole` | `admin`, `dokter`, `radiolog`, `resepsionis` |
| `gender` | `L`, `P` |
| `modality` | `CR`, `DX`, `CT`, `MR`, `US`, `MG`, `NM`, `PT`, `XA`, `RF` |
| `studystatus` | `scheduled`, `in_progress`, `completed`, `reported`, `cancelled` |
| `reportstatus` | `draft`, `pending_review`, `finalized`, `amended` |
| `reportpriority` | `routine`, `urgent`, `stat` |
| `appointmentstatus` | `pending`, `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show` |
| `appointmentpriority` | `routine`, `urgent`, `emergency` |
