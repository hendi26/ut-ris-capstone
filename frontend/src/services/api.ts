/**
 * Axios instance — base API client with auth interceptors and token refresh.
 *
 * Flow:
 *   1. Attach access token to every request.
 *   2. On 401 response, attempt silent token refresh using the refresh token.
 *   3. If refresh succeeds, retry the original request once.
 *   4. If refresh fails, clear auth state and redirect to /login.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

// Extend config to track retry attempts
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  // Dev: proxy via Vite (baseURL = "" agar path /api langsung di-proxy)
  // Production: VITE_API_BASE_URL berisi URL Render backend
  baseURL: import.meta.env.PROD
    ? (import.meta.env.VITE_API_BASE_URL ?? "")
    : "",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ─── Request interceptor — attach access token ────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — silent token refresh on 401 ──────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig;

    // Only attempt refresh once, and not on the auth endpoints themselves
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          // Use the api instance so the Vite proxy handles it (avoids CORS in dev)
          const { data } = await api.post(
            "/api/v1/auth/refresh",
            { refresh_token: refreshToken }
          );

          // Store the new access token
          useAuthStore.getState().setAccessToken(data.access_token);

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — force logout
          useAuthStore.getState().clearAuth();
          window.location.href = "/login";
        }
      } else {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
