import apiClient from "./client";
import type { User } from "@/lib";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiClient.post("/api/auth/login", data);
  return res.data;
}

export async function registerApi(data: RegisterRequest): Promise<AuthResponse & { pendingApproval?: boolean }> {
  const res = await apiClient.post("/api/auth/register", data);
  return res.data;
}

export async function getMeApi(): Promise<User> {
  const res = await apiClient.get("/api/auth/me");
  return res.data.user || res.data;
}
