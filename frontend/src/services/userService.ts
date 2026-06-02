import api from "./api";

export type UserRole =
  | "admin"
  | "radiolog"
  | "dokter"
  | "resepsionis"
  | "patient";

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserPayload {
  email?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export const userService = {
  async list(params?: {
    page?: number;
    size?: number;
    role?: string;
  }): Promise<UserListResponse> {
    const { data } = await api.get("/api/v1/users", {
      params,
    });

    return data;
  },

  async get(id: number): Promise<User> {
    const { data } = await api.get(
      `/api/v1/users/${id}`
    );

    return data;
  },

  async create(
    payload: CreateUserPayload
  ): Promise<User> {
    const { data } = await api.post(
      "/api/v1/users",
      payload
    );

    return data;
  },

  async update(
    id: number,
    payload: UpdateUserPayload
  ): Promise<User> {
    const { data } = await api.patch(
      `/api/v1/users/${id}`,
      payload
    );

    return data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(
      `/api/v1/users/${id}`
    );
  },

  async toggleActive(
    id: number
  ): Promise<User> {
    const { data } = await api.post(
      `/api/v1/users/${id}/toggle-active`
    );

    return data;
  },
};