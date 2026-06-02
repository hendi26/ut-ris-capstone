/**
 * Auth store — manages authentication state using Zustand.
 *
 * Persisted to localStorage so the session survives page refresh.
 * The refresh token is stored separately (httpOnly cookie is ideal in
 * production — for this capstone we keep it in memory/localStorage).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role:
    | "admin"
    | "radiolog"
    | "dokter"
    | "resepsionis"
    | "patient";
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (
    user: AuthUser,
    accessToken: string,
    refreshToken: string
  ) => void;

  setAccessToken: (token: string) => void;

  clearAuth: () => void;

  hasRole: (...roles: AuthUser["role"][]) => boolean;

  can: (permission: string) => boolean;
}

const ROLE_PERMISSIONS: Record<
  AuthUser["role"],
  Set<string>
> = {
  admin: new Set([
    "users:read",
    "users:create",
    "users:update",
    "users:delete",

    "patients:read",
    "patients:create",
    "patients:update",
    "patients:delete",

    "appointments:read",
    "appointments:create",
    "appointments:update",
    "appointments:delete",

    "studies:read",
    "studies:create",
    "studies:update",
    "studies:delete",

    "reports:read",
    "reports:create",
    "reports:update",
    "reports:delete",

    "dashboard:read",
  ]),

  radiolog: new Set([
    "patients:read",

    "appointments:read",

    "studies:read",
    "studies:create",
    "studies:update",

    "reports:read",
    "reports:create",
    "reports:update",

    "dashboard:read",
  ]),

  dokter: new Set([
    "patients:read",

    "appointments:read",
    "appointments:create",

    "studies:read",

    "reports:read",

    "dashboard:read",
  ]),

  resepsionis: new Set([
    "patients:read",
    "patients:create",
    "patients:update",

    "appointments:read",
    "appointments:create",
    "appointments:update",
    "appointments:delete",

    "studies:read",

    "dashboard:read",
  ]),

  patient: new Set([
    "patient:profile",
    "patient:studies",
    "patient:reports",
  ]),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,

      accessToken: null,

      refreshToken: null,

      isAuthenticated: false,

      setAuth: (
        user,
        accessToken,
        refreshToken
      ) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      setAccessToken: (token) =>
        set({
          accessToken: token,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      hasRole: (...roles) => {
        const { user } = get();

        return user
          ? roles.includes(user.role)
          : false;
      },

      can: (permission) => {
        const { user } = get();

        if (!user) {
          return false;
        }

        return (
          ROLE_PERMISSIONS[user.role]?.has(
            permission
          ) ?? false
        );
      },
    }),
    {
      name: "ris-auth",

      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated:
          state.isAuthenticated,
      }),
    }
  )
);