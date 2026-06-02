# 06 — Backend: Panduan Kode

## Struktur Lapisan (Clean Architecture)

```
Request → API Endpoint → Service → Repository → Model → Database
```

Setiap lapisan punya tanggung jawab yang jelas dan tidak boleh dilanggar.

---

## Layer 1: Models (ORM)

Models mendefinisikan struktur tabel database menggunakan SQLAlchemy 2.0 dengan **Mapped types** (type-safe).

### Base Model & TimestampMixin

```python
# app/models/base_model.py
class TimestampMixin:
    """Tambahkan created_at dan updated_at ke semua model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),  # database yang set, bukan Python
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),        # otomatis update saat row berubah
        nullable=False,
    )
```

### Cara Mendefinisikan Model

```python
# app/models/patient.py
class Patient(TimestampMixin, Base):
    __tablename__ = "patients"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Required field
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Optional field — gunakan Optional[str]
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Enum field
    gender: Mapped[Gender] = mapped_column(Enum(Gender, name="gender"), nullable=False)

    # Relasi one-to-many
    studies: Mapped[List["Study"]] = relationship(
        "Study",
        back_populates="patient",
        cascade="all, delete-orphan",  # hapus study jika pasien dihapus
        lazy="select",                  # load saat diakses (tidak eager)
    )
```

### Relasi dengan Multiple FK ke Tabel yang Sama

```python
# app/models/study.py — dua FK ke tabel users
class Study(TimestampMixin, Base):
    referring_doctor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    performing_radiologist_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Harus specify foreign_keys karena ada ambiguitas
    referring_doctor: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[referring_doctor_id],
        back_populates="referred_studies",
    )
    performing_radiologist: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[performing_radiologist_id],
        back_populates="performed_studies",
    )
```

---

## Layer 2: Schemas (Pydantic DTOs)

Schemas memisahkan representasi API dari model database.

```python
# app/schemas/patient.py

# Base — field yang sama untuk create dan response
class PatientBase(BaseModel):
    full_name: str
    date_of_birth: date
    gender: Gender
    nik: Optional[str] = None
    phone_number: Optional[str] = None

# Create — field yang dikirim saat membuat pasien baru
class PatientCreate(PatientBase):
    pass  # sama dengan base, tidak ada field tambahan

# Update — semua field opsional (PATCH semantics)
class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None

# Response — field yang dikembalikan ke client
class PatientResponse(PatientBase):
    id: int
    medical_record_number: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}  # bisa dibuat dari ORM object

# Paginated list response
class PatientListResponse(BaseModel):
    items: list[PatientResponse]
    total: int
    page: int
    size: int
    pages: int
```

### Validasi Custom di Schema

```python
# app/schemas/user.py
class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password minimal 8 karakter")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username hanya boleh mengandung huruf, angka, _ dan -")
        return v.lower()  # normalisasi ke lowercase
```

---

## Layer 3: Repositories (Data Access)

Repository mengisolasi semua query database. Service tidak boleh menulis SQL langsung.

### BaseRepository — Generic CRUD

```python
# app/repositories/base_repository.py
class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: int) -> Optional[ModelType]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 20) -> list[ModelType]:
        result = await self.db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def count(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar_one()

    async def create(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        await self.db.flush()    # kirim ke DB tapi belum commit
        await self.db.refresh(obj)  # reload dari DB (dapat ID, timestamps)
        return obj

    async def update(self, obj: ModelType, data: dict[str, Any]) -> ModelType:
        for key, value in data.items():
            if value is not None:
                setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        await self.db.delete(obj)
        await self.db.flush()
```

### Repository Spesifik

```python
# app/repositories/patient_repository.py
class PatientRepository(BaseRepository[Patient]):
    def __init__(self, db: AsyncSession):
        super().__init__(Patient, db)

    async def search(self, query: str, skip: int = 0, limit: int = 20) -> list[Patient]:
        """Cari pasien berdasarkan nama atau MRN."""
        result = await self.db.execute(
            select(Patient)
            .where(
                or_(
                    Patient.full_name.ilike(f"%{query}%"),
                    Patient.medical_record_number.ilike(f"%{query}%"),
                )
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def generate_mrn(self) -> str:
        """Generate nomor rekam medis unik."""
        result = await self.db.execute(
            select(func.count()).select_from(Patient)
        )
        count = result.scalar_one()
        return f"MRN{str(count + 1).zfill(6)}"
```

---

## Layer 4: Services (Business Logic)

Service berisi semua logika bisnis. Tidak ada query SQL di sini.

```python
# app/services/patient_service.py
class PatientService:
    def __init__(self, db: AsyncSession):
        self.patient_repo = PatientRepository(db)

    async def get_patients(self, page: int = 1, size: int = 20) -> PatientListResponse:
        """Ambil daftar pasien dengan pagination."""
        skip = (page - 1) * size
        patients = await self.patient_repo.get_all(skip=skip, limit=size)
        total = await self.patient_repo.count()
        pages = math.ceil(total / size) if total > 0 else 1

        return PatientListResponse(
            items=[PatientResponse.model_validate(p) for p in patients],
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    async def create_patient(self, data: PatientCreate) -> Patient:
        """Daftarkan pasien baru dengan MRN otomatis."""
        mrn = await self.patient_repo.generate_mrn()
        patient = Patient(**data.model_dump(), medical_record_number=mrn)
        return await self.patient_repo.create(patient)

    async def get_patient(self, patient_id: int) -> Patient:
        """Ambil satu pasien, raise 404 jika tidak ada."""
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pasien dengan ID {patient_id} tidak ditemukan",
            )
        return patient
```

---

## Layer 5: API Endpoints

Endpoint hanya bertugas routing, validasi input, dan memanggil service.

```python
# app/api/v1/endpoints/patients.py
router = APIRouter()

@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Daftarkan pasien baru",
)
async def create_patient(
    data: PatientCreate,                              # validasi input otomatis
    db: AsyncSession = Depends(get_db),               # inject DB session
    _: User = Depends(require_permission("patients:create")),  # cek izin
):
    # Tidak ada logika bisnis di sini — delegasikan ke service
    return await PatientService(db).create_patient(data)
```

---

## Database Session Management

```python
# app/core/dependencies.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield satu session per request.
    Auto commit jika sukses, auto rollback jika ada exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()    # commit di akhir request
        except Exception:
            await session.rollback()  # rollback jika ada error
            raise
        finally:
            await session.close()
```

**Penting**: `flush()` di repository mengirim SQL ke database tapi belum commit. Commit terjadi di `get_db()` setelah request selesai. Ini memastikan semua operasi dalam satu request bersifat atomic.

---

## Konfigurasi Aplikasi

```python
# app/core/config.py
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    APP_NAME: str = "UT-RIS Radiology Information System"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://..."
    SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        # Support comma-separated string dari env var
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

settings = Settings()  # singleton — import ini di mana saja
```

---

## Database Migrations (Alembic)

```bash
# Buat migration baru setelah mengubah model
alembic revision --autogenerate -m "add examination_room to studies"

# Jalankan semua migration yang belum diaplikasikan
alembic upgrade head

# Rollback satu migration
alembic downgrade -1

# Lihat status migration
alembic current
alembic history
```

**Struktur migration file:**
```python
# alembic/versions/0002_add_room.py
def upgrade() -> None:
    op.add_column("studies",
        sa.Column("examination_room", sa.String(50), nullable=True)
    )

def downgrade() -> None:
    op.drop_column("studies", "examination_room")
```
