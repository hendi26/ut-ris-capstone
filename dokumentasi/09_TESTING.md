# 09 — Panduan Testing

## Setup Testing

```bash
cd backend

# Aktifkan virtual environment
venv\Scripts\activate

# Install test dependencies (sudah ada di requirements.txt)
pip install pytest pytest-asyncio aiosqlite

# Jalankan semua test
pytest

# Dengan output verbose
pytest -v

# Dengan coverage report
pytest --cov=app --cov-report=term-missing
```

---

## Konfigurasi Test

```python
# tests/conftest.py — shared fixtures

# Gunakan SQLite in-memory untuk test (tidak perlu PostgreSQL)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)

# Override dependency get_db untuk menggunakan test database
async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

app.dependency_overrides[get_db] = override_get_db

# Buat tabel sebelum test, hapus setelah selesai
@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

---

## Test Fixtures

```python
# Buat user untuk setiap role
@pytest_asyncio.fixture
async def admin_user(db_session):
    return await _create_user(db_session, "test_admin", UserRole.ADMIN)

@pytest_asyncio.fixture
async def radiolog_user(db_session):
    return await _create_user(db_session, "test_radiolog", UserRole.RADIOLOG)

# Dapatkan token untuk setiap role
@pytest_asyncio.fixture
async def admin_token(client, admin_user):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.username, "password": "password123"},
    )
    return resp.json()["access_token"]
```

---

## Test Suite 1: Health Check (test_health.py)

```python
@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
```

---

## Test Suite 2: Authentication (test_auth.py)

```python
# Test login berhasil
@pytest.mark.asyncio
async def test_login_success(client, admin_user):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.username, "password": "password123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert body["user"]["role"] == "admin"

# Test login gagal — password salah
@pytest.mark.asyncio
async def test_login_wrong_password(client, admin_user):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.username, "password": "wrongpassword"},
    )
    assert resp.status_code == 401

# Test username enumeration prevention
# User tidak ada harus return 401, bukan 404
@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "ghost_user", "password": "password123"},
    )
    assert resp.status_code == 401  # bukan 404!

# Test refresh token
@pytest.mark.asyncio
async def test_refresh_token(client, admin_user):
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.username, "password": "password123"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()

# Test access token tidak bisa dipakai sebagai refresh token
@pytest.mark.asyncio
async def test_refresh_with_access_token_fails(client, admin_token):
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": admin_token},  # salah! ini access token
    )
    assert resp.status_code == 401

# Test logout + token revocation
@pytest.mark.asyncio
async def test_logout(client, admin_user, admin_token):
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.username, "password": "password123"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    # Logout
    resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200

    # Refresh token sekarang tidak valid
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401
```

---

## Test Suite 3: RBAC (test_rbac.py)

```python
# Helper
def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

# Admin bisa akses /users
@pytest.mark.asyncio
async def test_list_users_admin_allowed(client, admin_token):
    resp = await client.get("/api/v1/users", headers=auth(admin_token))
    assert resp.status_code == 200

# Non-admin tidak bisa akses /users
@pytest.mark.asyncio
@pytest.mark.parametrize("token_fixture", ["radiolog_token", "dokter_token", "resepsionis_token"])
async def test_list_users_non_admin_forbidden(client, request, token_fixture):
    token = request.getfixturevalue(token_fixture)
    resp = await client.get("/api/v1/users", headers=auth(token))
    assert resp.status_code == 403

# Semua role bisa baca pasien
@pytest.mark.asyncio
@pytest.mark.parametrize("token_fixture", [
    "admin_token", "radiolog_token", "dokter_token", "resepsionis_token"
])
async def test_list_patients_all_roles_allowed(client, request, token_fixture):
    token = request.getfixturevalue(token_fixture)
    resp = await client.get("/api/v1/patients", headers=auth(token))
    assert resp.status_code == 200

# Hanya admin dan resepsionis yang bisa buat pasien
@pytest.mark.asyncio
@pytest.mark.parametrize("token_fixture", ["admin_token", "resepsionis_token"])
async def test_create_patient_allowed(client, request, token_fixture):
    token = request.getfixturevalue(token_fixture)
    resp = await client.post(
        "/api/v1/patients",
        json={"full_name": "Test", "date_of_birth": "1990-01-15", "gender": "L"},
        headers=auth(token),
    )
    assert resp.status_code == 201

# Radiolog dan dokter tidak bisa buat pasien
@pytest.mark.asyncio
@pytest.mark.parametrize("token_fixture", ["radiolog_token", "dokter_token"])
async def test_create_patient_forbidden(client, request, token_fixture):
    token = request.getfixturevalue(token_fixture)
    resp = await client.post(
        "/api/v1/patients",
        json={"full_name": "Test", "date_of_birth": "1990-01-15", "gender": "L"},
        headers=auth(token),
    )
    assert resp.status_code == 403

# Unit test permission matrix
def test_permission_matrix():
    from app.core.permissions import has_permission
    from app.models.user import User, UserRole

    def make_user(role):
        u = User.__new__(User)
        u.role = role
        return u

    admin      = make_user(UserRole.ADMIN)
    radiolog   = make_user(UserRole.RADIOLOG)
    dokter     = make_user(UserRole.DOKTER)
    resepsionis = make_user(UserRole.RESEPSIONIS)

    # Admin punya semua akses
    assert has_permission(admin, "users:delete")
    assert has_permission(admin, "reports:delete")

    # Radiolog bisa tulis laporan tapi tidak bisa kelola user
    assert has_permission(radiolog, "reports:create")
    assert not has_permission(radiolog, "users:read")
    assert not has_permission(radiolog, "patients:create")

    # Dokter hanya bisa baca laporan
    assert has_permission(dokter, "reports:read")
    assert not has_permission(dokter, "reports:create")

    # Resepsionis bisa kelola pasien tapi tidak bisa baca laporan
    assert has_permission(resepsionis, "patients:create")
    assert not has_permission(resepsionis, "reports:read")
    assert not has_permission(resepsionis, "users:read")
```

---

## Menjalankan Test Spesifik

```bash
# Jalankan satu file test
pytest tests/test_auth.py -v

# Jalankan satu test function
pytest tests/test_auth.py::test_login_success -v

# Jalankan test dengan keyword
pytest -k "login" -v

# Jalankan test dengan marker
pytest -m asyncio -v

# Skip test tertentu
pytest --ignore=tests/test_rbac.py

# Jalankan dengan output print
pytest -s -v
```

---

## Coverage Report

```bash
# Install coverage
pip install pytest-cov

# Jalankan dengan coverage
pytest --cov=app --cov-report=term-missing --cov-report=html

# Buka laporan HTML
# Windows:
start htmlcov/index.html
# Linux/Mac:
open htmlcov/index.html
```

**Target coverage minimum:**
- `core/security.py` → 90%+
- `core/permissions.py` → 95%+
- `services/auth_service.py` → 85%+
- `api/v1/endpoints/` → 80%+

---

## Menambah Test Baru

```python
# Template test endpoint baru
@pytest.mark.asyncio
async def test_nama_test(client: AsyncClient, admin_token):
    """Deskripsi apa yang ditest."""
    resp = await client.get(
        "/api/v1/endpoint-baru",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "field_yang_diharapkan" in body
```
