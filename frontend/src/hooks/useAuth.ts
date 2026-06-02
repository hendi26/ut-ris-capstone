/**
 * useAuth — convenience hook for auth state and actions.
 *
 * Usage:
 *   const { user, isAdmin, can, logout } = useAuth();
 */

import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";

export function useAuth() {
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth, hasRole, can, refreshToken } = useAuthStore();

  const isAdmin       = hasRole("admin");
  const isRadiolog    = hasRole("radiolog");
  const isDokter      = hasRole("dokter");
  const isResepsionis = hasRole("resepsionis");

  const logout = async () => {
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  return {
    user,
    isAuthenticated,
    isAdmin,
    isRadiolog,
    isDokter,
    isResepsionis,
    can,
    hasRole,
    logout,
  };
}
