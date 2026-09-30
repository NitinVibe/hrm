import api from "./client";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  email: string;
  role?: string | null;
  role_id?: string;
  is_active?: boolean;
  is_verified?: boolean;
  user: {
    id?: string;
    email?: string;
    role?: string | null;
    [key: string]: any;
  };
  organization?: {
    id?: string;
    name?: string;
    slug?: string;
    [key: string]: any;
  } | null;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code?: string;
    department_id?: string | null;
    designation_id?: string | null;
    employment_status?: string;
    joining_date?: string;
    phone?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export type CurrentUser = UserProfile;

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
  const response = await api.get<any>("/auth/me");
  const data = response.data;
  if (!data.user) {
    data.user = {
      id: data.id,
      email: data.email,
      role: data.role,
    };
  }
  return data as CurrentUser;
}

export async function getUserProfile(): Promise<UserProfile> {
  return getCurrentUser();
}


export async function changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>("/auth/change-password", {
    current_password,
    new_password,
  });
  return response.data;
}
