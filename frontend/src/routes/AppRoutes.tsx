import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
// Layouts
import MainLayout from "@/components/layout/MainLayout";
import AuthLayout from "@/components/layout/AuthLayout";
// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PatientsPage from "@/pages/PatientsPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import ExaminationsPage from "@/pages/ExaminationsPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
import NotFoundPage from "@/pages/NotFoundPage";
import PatientProfilePage from "@/pages/PatientProfilePage";
import PatientStudiesPage from "@/pages/PatientStudiesPage";
import PatientReportsPage from "@/pages/PatientReportsPage";

/* =====================================================
 * ROUTE GUARDS
 * ===================================================== */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}
function PatientOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "patient" ? <>{children}</> : <Navigate to="/dashboard" replace />;
}
function StaffOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return user.role !== "patient" ? <>{children}</> : <Navigate to="/patient/profile" replace />;
}

/* =====================================================
 * ROUTES
 * ===================================================== */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
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
      {/* Protected */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Staff-only routes */}
        <Route path="patients"     element={<StaffOnlyRoute><PatientsPage /></StaffOnlyRoute>} />
        <Route path="appointments" element={<StaffOnlyRoute><AppointmentsPage /></StaffOnlyRoute>} />
        <Route path="examinations" element={<StaffOnlyRoute><ExaminationsPage /></StaffOnlyRoute>} />
        <Route path="reports"      element={<StaffOnlyRoute><ReportsPage /></StaffOnlyRoute>} />
        <Route path="users"        element={<StaffOnlyRoute><UsersPage /></StaffOnlyRoute>} />

        {/* Patient Portal — patient role only */}
        <Route path="patient/profile" element={<PatientOnlyRoute><PatientProfilePage /></PatientOnlyRoute>} />
        <Route path="patient/studies" element={<PatientOnlyRoute><PatientStudiesPage /></PatientOnlyRoute>} />
        <Route path="patient/reports" element={<PatientOnlyRoute><PatientReportsPage /></PatientOnlyRoute>} />
      </Route>
      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}