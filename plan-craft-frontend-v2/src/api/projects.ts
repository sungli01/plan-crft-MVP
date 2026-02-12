import apiClient from "./client";

export interface Project {
  id: string;
  title: string;
  categoryId: string;
  status: "draft" | "completed" | "generating";
  content?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface CreateProjectRequest {
  title: string;
  categoryId: string;
  context?: string;
  requirements?: string;
}

export async function getProjectsApi(): Promise<Project[]> {
  const res = await apiClient.get("/api/projects");
  return res.data;
}

export async function getProjectApi(id: string): Promise<Project> {
  const res = await apiClient.get(`/api/projects/${id}`);
  return res.data;
}

export async function createProjectApi(data: CreateProjectRequest): Promise<Project> {
  const res = await apiClient.post("/api/projects", data);
  return res.data;
}

export async function updateProjectApi(id: string, data: Partial<Project>): Promise<Project> {
  const res = await apiClient.patch(`/api/projects/${id}`, data);
  return res.data;
}

export async function deleteProjectApi(id: string): Promise<void> {
  await apiClient.delete(`/api/projects/${id}`);
}
