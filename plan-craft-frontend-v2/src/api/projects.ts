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
  idea?: string;
  categoryId?: string;
  context?: string;
  requirements?: string;
}

export async function getProjectsApi(): Promise<Project[]> {
  const res = await apiClient.get("/api/projects");
  // Backend wraps in { projects: [...] }
  return res.data.projects || res.data;
}

export async function getProjectApi(id: string): Promise<Project> {
  const res = await apiClient.get(`/api/projects/${id}`);
  // Backend wraps in { project: {...} }
  return res.data.project || res.data;
}

export async function createProjectApi(data: CreateProjectRequest): Promise<Project> {
  const res = await apiClient.post("/api/projects", data);
  return res.data.project || res.data;
}

export async function updateProjectApi(id: string, data: Partial<Project>): Promise<Project> {
  const res = await apiClient.patch(`/api/projects/${id}`, data);
  return res.data;
}

export async function deleteProjectApi(id: string): Promise<void> {
  await apiClient.delete(`/api/projects/${id}`);
}
