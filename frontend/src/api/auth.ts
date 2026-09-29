import api from "./client";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  organization_id: string;
  role_id: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);

  const response = await api.post<LoginResponse>("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>("/auth/me");
  return response.data;
}
