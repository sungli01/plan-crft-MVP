import apiClient from "./client";

export interface GenerateRequest {
  title: string;
  categoryId: string;
  context?: string;
  requirements?: string;
}

export interface AgentProgress {
  status: string;
  progress: number;
  detail?: string;
  currentSection?: number;
  totalSections?: number;
}

export interface GenerateStatus {
  projectId: string;
  status: "draft" | "generating" | "completed" | "failed";
  progress?: {
    phase?: string;
    agents?: Record<string, AgentProgress>;
    logs?: Array<{ timestamp: number; agent: string; level: string; message: string }>;
  };
  document?: {
    id: string;
    qualityScore: number;
    sectionCount: number;
    wordCount: number;
    imageCount: number;
    createdAt: string;
  };
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
