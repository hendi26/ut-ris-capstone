# 10 — Keputusan Desain

Dokumen ini menjelaskan alasan di balik pilihan teknologi dan arsitektur yang digunakan dalam UT-RIS.

---

## 1. Mengapa FastAPI?

**Pilihan**: FastAPI (Python) untuk backend API.

**Alasan:**
- **Performa tinggi** — berbasis Starlette dan asyncio, setara dengan Node.js/Go untuk I/O-bound workloads
- **Type safety** — integrasi native dengan Pydantic untuk validasi otomatis
- **Auto-dokumentasi** — Swagger UI dan ReDoc di-generate otomatis dari kode
- **Async-first** — cocok untuk operasi database yang banyak (query radiologi bisa kompleks)
- **Ekosistem Python** — banyak library medis/saintifik tersedia (DICOM, image processing)

**Alternatif yang dipertimbangkan:**
- Django REST Framework — lebih berat, tidak async-native
- Flask — terlalu minimal, perlu banyak setup manual
- Node.js/Express — tim lebih familiar dengan Python

---

## 2. Mengapa SQLAlchemy 2.0 (Async)?

**Pilihan**: SQLAlchemy 2.0 dengan asyncpg driver.

**Alasan:**
- **Async support** — `AsyncSession` memungkinkan query non-blocking
- **Type-safe ORM** — `Mapped[str]`, `mapped_column()` memberikan type hints yang akurat
- **Alembic integration** — migrasi database yang terstruktur dan reversible
- **Mature & battle-tested** — digunakan di production oleh banyak perusahaan besar

**Kenapa tidak Tortoise ORM atau SQLModel?**
- SQLAlchemy lebih mature dan dokumentasinya lebih lengkap
- SQLModel (berbasis SQLAlchemy) masih relatif baru

---

## 3. Mengapa Clean Architecture?

**Pilihan**: Memisahkan kode menjadi 4 lapisan: API → Service → Repository → Model.

**Alasan:**
- **Testability** — setiap lapisan bisa ditest secara independen
- **Maintainability** — mudah menemukan di mana harus mengubah kode
- **Separation of concerns** — logika bisnis tidak tersebar di endpoint
- **Scalability** — mudah menambah fitur baru tanpa merusak yang lama

**Contoh konkret:**
```
Jika ingin mengganti PostgreSQL ke MySQL:
→ Hanya perlu mengubah Repository layer
→ Service dan API layer tidak perlu diubah

Jika ingin menambah validasi bisnis baru:
→ Tambahkan di Service layer
→ Repository dan API tidak perlu diubah
```

---

## 4. Mengapa JWT dengan Dual Token?

**Pilihan**: Access token (30 menit) + Refresh token (7 hari).

**Alasan:**
- **Security** — access token yang pendek membatasi window of exposure jika token dicuri
- **UX** — refresh token yang panjang mencegah user harus login ulang setiap 30 menit
- **Revocation** — refresh token bisa di-blacklist saat logout (access token expire natural)
- **Stateless** — tidak perlu session storage di server

**Kenapa tidak session-based auth?**
- JWT lebih cocok untuk SPA (Single Page Application)
- Tidak perlu sticky sessions untuk horizontal scaling
- Lebih mudah diintegrasikan dengan mobile app di masa depan

**Trade-off yang diterima:**
- Access token tidak bisa di-revoke sebelum expire (30 menit)
- Token blacklist saat ini in-memory (perlu Redis di production)

---

## 5. Mengapa React + Vite?

**Pilihan**: React 18 dengan Vite sebagai build tool.

**Alasan:**
- **Vite** — startup development server yang sangat cepat (< 1 detik vs webpack 30+ detik)
- **React 18** — concurrent features, Suspense, dan ekosistem yang sangat besar
- **TypeScript** — type safety di frontend, mengurangi runtime errors
- **TailwindCSS** — utility-first CSS yang konsisten dan mudah di-maintain

**Kenapa tidak Next.js?**
- UT-RIS adalah internal tool, tidak butuh SSR/SEO
- SPA lebih sederhana untuk aplikasi yang memerlukan banyak interaktivitas

---

## 6. Mengapa Zustand untuk State Management?

**Pilihan**: Zustand (bukan Redux atau Context API).

**Alasan:**
- **Minimal boilerplate** — tidak perlu actions, reducers, dispatch
- **Persist middleware** — built-in support untuk localStorage persistence
- **Selector pattern** — re-render hanya jika state yang di-subscribe berubah
- **Ukuran kecil** — ~1KB gzipped

**Perbandingan:**
```typescript
// Redux — verbose
dispatch(setUser({ user, token }))

// Zustand — langsung
useAuthStore.getState().setAuth(user, token, refreshToken)
```

---

## 7. Mengapa TanStack Query?

**Pilihan**: TanStack Query (React Query) untuk server state.

**Alasan:**
- **Caching otomatis** — data tidak di-fetch ulang jika masih fresh (5 menit)
- **Background refetch** — data diperbarui di background tanpa loading state
- **Loading/error states** — built-in, tidak perlu useState manual
- **Pagination** — mudah implementasi dengan `queryKey: ["patients", page]`

**Tanpa TanStack Query:**
```typescript
// Manual — verbose dan error-prone
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetchPatients().then(setData).catch(setError).finally(() => setLoading(false));
}, [page]);
```

**Dengan TanStack Query:**
```typescript
// Bersih dan powerful
const { data, isLoading, isError } = useQuery({
  queryKey: ["patients", page],
  queryFn: () => fetchPatients(page),
});
```

---

## 8. Mengapa Permission String ("patients:create")?

**Pilihan**: Permission berbasis string `"resource:action"` bukan boolean flags.

**Alasan:**
- **Granular** — bisa kontrol per-operasi, bukan hanya per-resource
- **Readable** — `require_permission("reports:create")` lebih jelas dari `require_can_write_reports()`
- **Extensible** — mudah menambah permission baru tanpa mengubah kode yang ada
- **Sinkron** — string yang sama digunakan di backend (frozenset) dan frontend (Set)

**Contoh extensibility:**
```python
# Tambah permission baru tanpa mengubah kode lain
UserRole.RADIOLOG: frozenset({
    ...
    "reports:export",   # permission baru
    "studies:archive",  # permission baru
})
```

---

## 9. Mengapa Alembic untuk Migrasi?

**Pilihan**: Alembic (bukan auto-migrate atau manual SQL).

**Alasan:**
- **Version control untuk database** — setiap perubahan schema tercatat
- **Reversible** — setiap migration punya `upgrade()` dan `downgrade()`
- **Team collaboration** — tidak ada konflik schema antar developer
- **Production-safe** — bisa review migration sebelum diaplikasikan

**Kenapa tidak `Base.metadata.create_all()`?**
- `create_all()` tidak bisa mengubah tabel yang sudah ada
- Tidak ada history perubahan
- Tidak bisa rollback

---

## 10. Keputusan yang Disengaja Ditunda

Beberapa fitur sengaja tidak diimplementasikan di fase ini untuk menjaga fokus:

| Fitur | Alasan Ditunda |
|-------|----------------|
| Redis untuk token blacklist | Perlu setup tambahan, in-memory cukup untuk development |
| File upload (DICOM images) | Kompleksitas tinggi, butuh storage solution (S3/MinIO) |
| Email notifications | Perlu SMTP setup, bukan core functionality |
| Audit log | Bisa ditambahkan sebagai middleware nanti |
| Rate limiting | Perlu Redis atau middleware khusus |
| WebSocket (real-time) | Overkill untuk fase awal |
| Multi-tenancy | Tidak diperlukan untuk satu rumah sakit |

---

## Ringkasan Trade-offs

| Keputusan | Keuntungan | Kekurangan |
|-----------|-----------|------------|
| JWT stateless | Scalable, no session store | Access token tidak bisa di-revoke |
| In-memory blacklist | Simple, no Redis needed | Reset saat server restart |
| SQLite untuk test | Cepat, no DB setup | Tidak 100% identik dengan PostgreSQL |
| Async SQLAlchemy | Performa tinggi | Lebih kompleks dari sync |
| Permission string | Granular, extensible | Harus sinkron manual antara FE dan BE |
