import apiClient from "./client";

export interface GenerateRequest {
  title: string;
  categoryId: string;
  context?: string;
  requirements?: string;
}

export interface GenerateStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  step?: string;
  result?: string;
  error?: string;
}

export async function startGenerateApi(projectId: string, data?: GenerateRequest): Promise<{ jobId?: string; status: string }> {
  const res = await apiClient.post(`/api/generate/${projectId}`, data);
  return res.data;
}

export async function getGenerateStatusApi(projectId: string): Promise<GenerateStatus> {
  const res = await apiClient.get(`/api/generate/${projectId}/status`);
  return res.data;
}

export async function downloadGeneratedApi(projectId: string): Promise<Blob> {
  const res = await apiClient.get(`/api/generate/${projectId}/download`, {
    responseType: "blob",
  });
  return res.data;
}
