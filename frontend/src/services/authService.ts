import api from "./api";
import { AuthUser } from "@/store/authStore";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // FastAPI OAuth2PasswordRequestForm expects form-encoded data
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const { data } = await api.post<LoginResponse>("/api/v1/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post("/api/v1/auth/logout", { refresh_token: refreshToken });
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { data } = await api.post<RefreshResponse>("/api/v1/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>("/api/v1/auth/me");
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/api/v1/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
