import apiClient from "./client";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role: string;
  approved: boolean;
  created_at: string;
  updated_at?: string;
  project_count: number;
  total_tokens: number;
  total_cost: number;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await apiClient.get("/api/admin/users");
  return res.data.users;
}

export async function updateUserPlan(userId: string, plan: string) {
  const res = await apiClient.patch(`/api/admin/users/${userId}`, { plan });
  return res.data;
}

export async function updateUserRole(userId: string, role: string) {
  const res = await apiClient.patch(`/api/admin/users/${userId}/role`, { role });
  return res.data;
}

export async function approveUser(userId: string) {
  const res = await apiClient.patch(`/api/admin/users/${userId}/approve`);
  return res.data;
}

export async function deleteUser(userId: string) {
  const res = await apiClient.delete(`/api/admin/users/${userId}`);
  return res.data;
}
