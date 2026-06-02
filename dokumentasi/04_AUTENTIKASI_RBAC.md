# 04 — Autentikasi & Role-Based Access Control (RBAC)

## Gambaran Sistem Auth

UT-RIS menggunakan **JWT (JSON Web Token)** dengan dua jenis token:

| Token | TTL | Isi | Kegunaan |
|-------|-----|-----|----------|
| Access Token | 30 menit | `sub`, `role`, `jti`, `type`, `iat`, `exp` | Akses API |
| Refresh Token | 7 hari | `sub`, `jti`, `type`, `iat`, `exp` | Perbarui access token |

---

## Struktur JWT Payload

### Access Token
```json
{
  "sub":  "42",
  "role": "radiolog",
  "jti":  "550e8400-e29b-41d4-a716-446655440000",
  "type": "access",
  "iat":  1715000000,
  "exp":  1715001800
}
```

### Refresh Token
```json
{
  "sub":  "42",
  "jti":  "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "type": "refresh",
  "iat":  1715000000,
  "exp":  1715604800
}
```

---

## Implementasi Backend

### 1. Membuat Token (security.py)

```python
import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(subject: Any, role: str) -> str:
    """Buat JWT access token dengan role disematkan."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub":  str(subject),   # user ID
        "role": role,           # "admin" | "radiolog" | "dokter" | "resepsionis"
        "jti":  str(uuid.uuid4()),  # unique token ID untuk revocation
        "type": "access",
        "iat":  now,
        "exp":  expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Any) -> tuple[str, str]:
    """Buat JWT refresh token. Returns (token, jti)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())
    payload = {
        "sub":  str(subject),
        "jti":  jti,
        "type": "refresh",
        "iat":  now,
        "exp":  expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM), jti
```

### 2. Token Blacklist (security.py)

```python
# In-memory blacklist — ganti dengan Redis di production
_blacklisted_jtis: set[str] = set()

def blacklist_token(jti: str) -> None:
    """Tambahkan JTI ke blacklist saat logout."""
    _blacklisted_jtis.add(jti)

def is_token_blacklisted(jti: str) -> bool:
    """Cek apakah token sudah direvoke."""
    return jti in _blacklisted_jtis
```

### 3. Validasi Token (dependencies.py)

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    credentials_exc = HTTPException(
        status_code=401,
        detail="Token tidak valid atau sudah kadaluarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exc

    # Pastikan ini access token, bukan refresh token
    if payload.get("type") != "access":
        raise credentials_exc

    # Cek blacklist (token yang sudah logout)
    jti = payload.get("jti")
    if jti and is_token_blacklisted(jti):
        raise credentials_exc

    user_id = payload.get("sub")
    user = await UserRepository(db).get_by_id(int(user_id))

    if user is None or not user.is_active:
        raise credentials_exc

    return user
```

### 4. Login dengan Timing-Safe Comparison (auth_service.py)

```python
async def login(self, credentials: LoginRequest) -> LoginResponse:
    user = await self.user_repo.get_by_username(credentials.username)

    # PENTING: selalu panggil verify_password meskipun user tidak ada
    # Ini mencegah timing attack untuk menebak username yang valid
    password_ok = verify_password(
        credentials.password,
        user.hashed_password if user
        else "$2b$12$invalidhashpadding000000000000000000000000000000000000000",
    )

    if not user or not password_ok:
        raise HTTPException(
            status_code=401,
            detail="Username atau password salah",  # pesan generik
        )
```

---

## Permission Matrix (RBAC)

```python
# core/permissions.py
ROLE_PERMISSIONS: dict[UserRole, frozenset[str]] = {
    UserRole.ADMIN: frozenset({
        "users:read", "users:create", "users:update", "users:delete",
        "patients:read", "patients:create", "patients:update", "patients:delete",
        "appointments:read", "appointments:create", "appointments:update", "appointments:delete",
        "studies:read", "studies:create", "studies:update", "studies:delete",
        "reports:read", "reports:create", "reports:update", "reports:delete",
        "dashboard:read",
    }),

    UserRole.RADIOLOG: frozenset({
        "patients:read",
        "appointments:read",
        "studies:read", "studies:create", "studies:update",
        "reports:read", "reports:create", "reports:update",
        "dashboard:read",
    }),

    UserRole.DOKTER: frozenset({
        "patients:read",
        "appointments:read", "appointments:create",
        "studies:read",
        "reports:read",
        "dashboard:read",
    }),

    UserRole.RESEPSIONIS: frozenset({
        "patients:read", "patients:create", "patients:update",
        "appointments:read", "appointments:create",
        "appointments:update", "appointments:delete",
        "studies:read",
        "dashboard:read",
    }),
}
```

### Tabel Akses Per Resource

| Resource | Admin | Radiolog | Dokter | Resepsionis |
|----------|:-----:|:--------:|:------:|:-----------:|
| users | CRUD | — | — | — |
| patients | CRUD | R | R | CRU |
| appointments | CRUD | R | CR | CRUD |
| studies | CRUD | CRU | R | R |
| reports | CRUD | CRU | R | — |
| dashboard | R | R | R | R |

> C=Create, R=Read, U=Update, D=Delete

---

## Dependency Factories

### require_permission — berbasis string permission

```python
def require_permission(permission: str) -> Callable:
    """
    Dependency factory untuk cek permission spesifik.
    
    Contoh penggunaan di endpoint:
    """
    async def _check(current_user: User = Depends(get_current_active_user)) -> User:
        if permission not in ROLE_PERMISSIONS.get(current_user.role, frozenset()):
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak. Diperlukan izin: '{permission}'",
            )
        return current_user
    return _check

# Penggunaan di endpoint:
@router.post("/patients")
async def create_patient(
    data: PatientCreate,
    _: User = Depends(require_permission("patients:create")),
    # ↑ Hanya admin dan resepsionis yang bisa lewat
):
    ...
```

### require_roles — berbasis role langsung

```python
def require_roles(*roles: UserRole) -> Callable:
    """
    Dependency factory untuk cek role secara langsung.
    """
    role_set = frozenset(roles)

    async def _check(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in role_set:
            allowed = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak. Role yang diizinkan: {allowed}",
            )
        return current_user
    return _check

# Pre-built shortcuts:
require_admin              = require_roles(UserRole.ADMIN)
require_admin_or_radiolog  = require_roles(UserRole.ADMIN, UserRole.RADIOLOG)
require_clinical_staff     = require_roles(UserRole.ADMIN, UserRole.RADIOLOG, UserRole.DOKTER)

# Penggunaan di endpoint:
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    _: User = Depends(require_admin),  # hanya admin
):
    ...
```

---

## Implementasi Frontend

### Auth Store (authStore.ts)

```typescript
// Permission matrix di frontend — harus sinkron dengan backend
const ROLE_PERMISSIONS: Record<AuthUser["role"], Set<string>> = {
  admin: new Set([
    "users:read", "users:create", "users:update", "users:delete",
    "patients:read", "patients:create", "patients:update", "patients:delete",
    // ... semua permission
  ]),
  radiolog: new Set([
    "patients:read", "appointments:read",
    "studies:read", "studies:create", "studies:update",
    "reports:read", "reports:create", "reports:update",
    "dashboard:read",
  ]),
  // ...
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Actions
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setAccessToken: (token) => set({ accessToken: token }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      // Permission helpers
      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      can: (permission) => {
        const { user } = get();
        if (!user) return false;
        return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
      },
    }),
    { name: "ris-auth" }  // key di localStorage
  )
);
```

### ProtectedContent Component

```tsx
// Sembunyikan/tampilkan UI berdasarkan role atau permission
export default function ProtectedContent({
  children,
  roles,
  permission,
  fallback = null,
}: ProtectedContentProps) {
  const { hasRole, can } = useAuthStore();

  const allowed =
    (roles && hasRole(...roles)) ||
    (permission && can(permission)) ||
    (!roles && !permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// Contoh penggunaan:
<ProtectedContent roles={["admin"]}>
  <button>Hapus Pengguna</button>
</ProtectedContent>

<ProtectedContent permission="patients:create">
  <button>Daftarkan Pasien</button>
</ProtectedContent>

<ProtectedContent
  roles={["admin", "radiolog"]}
  fallback={<p className="text-red-500">Akses ditolak</p>}
>
  <ReportEditor />
</ProtectedContent>
```

### useAuth Hook

```typescript
export function useAuth() {
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth, hasRole, can, refreshToken } = useAuthStore();

  const logout = async () => {
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);  // blacklist di server
      }
    } finally {
      clearAuth();  // hapus dari localStorage
      navigate("/login", { replace: true });
    }
  };

  return {
    user,
    isAuthenticated,
    isAdmin:       hasRole("admin"),
    isRadiolog:    hasRole("radiolog"),
    isDokter:      hasRole("dokter"),
    isResepsionis: hasRole("resepsionis"),
    can,
    hasRole,
    logout,
  };
}
```

### Silent Token Refresh (api.ts)

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;  // cegah infinite loop

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post("/api/v1/auth/refresh", {
            refresh_token: refreshToken,
          });

          // Simpan access token baru
          useAuthStore.getState().setAccessToken(data.access_token);

          // Retry request original dengan token baru
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          // Refresh gagal → paksa logout
          useAuthStore.getState().clearAuth();
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Sidebar dengan Role-Filtered Navigation

```typescript
// Sidebar.tsx — menu hanya tampil jika user punya akses
const navItems: NavItem[] = [
  { to: "/dashboard",    label: "Dashboard",   icon: LayoutDashboard },
  { to: "/patients",     label: "Pasien",       icon: Users,    permission: "patients:read" },
  { to: "/appointments", label: "Jadwal",       icon: Calendar, permission: "appointments:read" },
  { to: "/examinations", label: "Pemeriksaan",  icon: Stethoscope, permission: "studies:read" },
  { to: "/reports",      label: "Laporan",      icon: FileText, permission: "reports:read" },
  { to: "/users",        label: "Pengguna",     icon: UserCog,  roles: ["admin"] },
  { to: "/settings",     label: "Pengaturan",   icon: Settings },
];

// Filter berdasarkan role/permission user yang login
const visibleItems = navItems.filter((item) => {
  if (item.roles)      return hasRole(...item.roles);
  if (item.permission) return can(item.permission);
  return true;  // tidak ada restriction = tampil untuk semua
});
```

---

## Keamanan Tambahan

### Security Headers (main.py)
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

### Password Validation (schemas/user.py)
```python
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
    if len(v) < 3:
        raise ValueError("Username minimal 3 karakter")
    return v.lower()
```
