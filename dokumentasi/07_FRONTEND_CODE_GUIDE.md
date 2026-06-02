# 07 — Frontend: Panduan Kode

## Entry Point

```tsx
// src/main.tsx — titik masuk aplikasi
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // data dianggap fresh selama 5 menit
      retry: 1,                   // coba ulang 1x jika gagal
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## Routing

```tsx
// src/routes/AppRoutes.tsx
export default function AppRoutes() {
  return (
    <Routes>
      {/* Route publik — redirect ke dashboard jika sudah login */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Route protected — redirect ke login jika belum login */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />   {/* Sidebar + Header + Outlet */}
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// Guard components
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}
```

---

## State Management (Zustand)

```typescript
// src/store/authStore.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Dipanggil setelah login berhasil
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      // Dipanggil setelah silent refresh
      setAccessToken: (token) => set({ accessToken: token }),

      // Dipanggil saat logout
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      // Cek role
      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      // Cek permission
      can: (permission) => {
        const { user } = get();
        if (!user) return false;
        return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
      },
    }),
    {
      name: "ris-auth",  // key di localStorage
      // Hanya persist field ini (bukan fungsi)
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

**Cara menggunakan store:**
```tsx
// Ambil satu field (re-render hanya jika field ini berubah)
const user = useAuthStore((s) => s.user);
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

// Ambil action
const setAuth = useAuthStore((s) => s.setAuth);
const clearAuth = useAuthStore((s) => s.clearAuth);

// Akses langsung (di luar React, misal di interceptor)
const token = useAuthStore.getState().accessToken;
useAuthStore.getState().clearAuth();
```

---

## API Layer (Axios)

```typescript
// src/services/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Attach token ke setiap request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Silent refresh saat token expired
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post("/api/v1/auth/refresh", {
            refresh_token: refreshToken,
          });
          useAuthStore.getState().setAccessToken(data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);  // retry request original
        } catch {
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

## Data Fetching (TanStack Query)

```tsx
// src/pages/DashboardPage.tsx
export default function DashboardPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["dashboard-stats"],   // cache key
    queryFn: dashboardService.getStats,
    refetchInterval: 30_000,         // auto-refresh setiap 30 detik
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      {isError && <ErrorBanner />}
      <StatCard title="Total Pasien" value={stats?.total_patients ?? 0} />
    </div>
  );
}

// src/pages/PatientsPage.tsx — dengan pagination
export default function PatientsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", page],    // key berubah saat page berubah → refetch
    queryFn: () => fetchPatients(page),
  });

  return (
    <div>
      {/* tabel */}
      <button onClick={() => setPage(p => p + 1)}>Berikutnya</button>
    </div>
  );
}
```

---

## Komponen Layout

### MainLayout

```tsx
// src/components/layout/MainLayout.tsx
export default function MainLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? "UT-RIS";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />                          {/* navigasi kiri */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />           {/* top bar */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />                       {/* halaman aktif */}
        </main>
      </div>
    </div>
  );
}
```

### Sidebar dengan Role Filtering

```tsx
// src/components/layout/Sidebar.tsx
const navItems: NavItem[] = [
  { to: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { to: "/patients",     label: "Pasien",      icon: Users,    permission: "patients:read" },
  { to: "/users",        label: "Pengguna",    icon: UserCog,  roles: ["admin"] },
];

export default function Sidebar() {
  const { user, can, hasRole, logout } = useAuth();

  // Filter menu berdasarkan role/permission
  const visibleItems = navItems.filter((item) => {
    if (item.roles)      return hasRole(...item.roles);
    if (item.permission) return can(item.permission);
    return true;
  });

  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-800">
        <Activity className="w-5 h-5" />
        <p className="font-bold text-sm">UT-RIS</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                isActive ? "bg-primary-700 text-white" : "text-primary-300 hover:bg-primary-800"
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-primary-800">
        <p className="text-sm font-medium">{user?.full_name}</p>
        <button onClick={logout}>Keluar</button>
      </div>
    </aside>
  );
}
```

---

## Komponen Reusable

### StatCard

```tsx
// src/components/common/StatCard.tsx
interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: "blue" | "green" | "amber" | "red";
  description?: string;
}

export default function StatCard({ title, value, icon: Icon, color = "blue", description }) {
  const colors = colorMap[color];
  return (
    <div className={clsx("card p-6 border", colors.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
        <div className={clsx("p-3 rounded-xl", colors.bg)}>
          <Icon className={clsx("w-6 h-6", colors.icon)} />
        </div>
      </div>
    </div>
  );
}

// Penggunaan:
<StatCard title="Total Pasien" value={150} icon={Users} color="blue" description="Terdaftar" />
```

### ProtectedContent

```tsx
// src/components/common/ProtectedContent.tsx
export default function ProtectedContent({ children, roles, permission, fallback = null }) {
  const { hasRole, can } = useAuthStore();

  const allowed =
    (roles && hasRole(...roles)) ||
    (permission && can(permission)) ||
    (!roles && !permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// Penggunaan:
<ProtectedContent roles={["admin"]}>
  <button className="btn-danger">Hapus</button>
</ProtectedContent>

<ProtectedContent permission="patients:create" fallback={<span>Tidak ada akses</span>}>
  <button className="btn-primary">Daftarkan Pasien</button>
</ProtectedContent>
```

### LoadingSpinner

```tsx
// src/components/common/LoadingSpinner.tsx
export default function LoadingSpinner({ size = "md", className }) {
  return (
    <div
      className={clsx(
        "rounded-full border-gray-200 border-t-primary-600 animate-spin",
        sizes[size],
        className
      )}
      role="status"
      aria-label="Memuat..."
    />
  );
}

// Full page loader
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" className="mx-auto mb-3" />
      <p className="text-sm text-gray-500">Memuat data...</p>
    </div>
  );
}
```

---

## Halaman Login

```tsx
// src/pages/LoginPage.tsx
export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      // Login mengembalikan tokens + user info sekaligus
      const response = await authService.login(data);
      setAuth(response.user, response.access_token, response.refresh_token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err?.response?.data?.detail ?? "Terjadi kesalahan. Coba lagi.";
      setServerError(message);
    }
  };

  return (
    <div className="card p-8 shadow-2xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        {serverError && <div className="bg-red-50 text-red-700 p-3">{serverError}</div>}

        <input
          {...register("username", { required: "Username wajib diisi" })}
          className="input"
          placeholder="Username"
        />

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
```

---

## Utility Functions

```typescript
// src/lib/utils.ts

// Merge Tailwind classes dengan aman (handles conflicts)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format tanggal ke format Indonesia
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Output: "8 Mei 2026"
}

// Format angka dengan pemisah ribuan
export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
  // Output: "1.234.567"
}
```

---

## Konfigurasi Vite

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),  // import @/components/...
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api/* ke backend saat development
      // Menghindari CORS issue di development
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

---

## CSS Utilities (TailwindCSS)

```css
/* src/index.css — custom component classes */

/* Tombol */
.btn-primary   { @apply btn bg-primary-600 text-white hover:bg-primary-700; }
.btn-secondary { @apply btn bg-white text-gray-700 border border-gray-300; }
.btn-danger    { @apply btn bg-red-600 text-white hover:bg-red-700; }

/* Form */
.input { @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
         focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20; }
.label { @apply block text-sm font-medium text-gray-700 mb-1; }

/* Card */
.card        { @apply bg-white rounded-xl border border-gray-200 shadow-sm; }
.card-header { @apply px-6 py-4 border-b border-gray-200; }
.card-body   { @apply px-6 py-4; }

/* Badge */
.badge       { @apply inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium; }
.badge-blue  { @apply badge bg-blue-100 text-blue-800; }
.badge-green { @apply badge bg-green-100 text-green-800; }
.badge-amber { @apply badge bg-amber-100 text-amber-800; }
```
