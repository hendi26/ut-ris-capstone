/**
 * ProtectedContent — conditionally renders children based on role/permission.
 *
 * Usage:
 *   // Show only to admin
 *   <ProtectedContent roles={["admin"]}>
 *     <DeleteButton />
 *   </ProtectedContent>
 *
 *   // Show to admin or radiolog
 *   <ProtectedContent roles={["admin", "radiolog"]}>
 *     <ReportEditor />
 *   </ProtectedContent>
 *
 *   // Show based on permission string
 *   <ProtectedContent permission="patients:create">
 *     <AddPatientButton />
 *   </ProtectedContent>
 *
 *   // Show fallback when access is denied
 *   <ProtectedContent roles={["admin"]} fallback={<p>Akses ditolak</p>}>
 *     <AdminPanel />
 *   </ProtectedContent>
 */

import { ReactNode } from "react";
import { AuthUser, useAuthStore } from "@/store/authStore";

interface ProtectedContentProps {
  children: ReactNode;
  /** Allow if user has ANY of these roles */
  roles?: AuthUser["role"][];
  /** Allow if user has this specific permission */
  permission?: string;
  /** Rendered when access is denied (default: null) */
  fallback?: ReactNode;
}

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
    (!roles && !permission); // no restriction = always show

  return allowed ? <>{children}</> : <>{fallback}</>;
}
