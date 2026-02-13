import apiClient from "./client";

export interface VersionSummary {
  id: string;
  version: number;
  createdAt: string;
  qualityScore: number | null;
  wordCount: number | null;
  sectionCount: number | null;
}

export async function getVersionsApi(projectId: string): Promise<{ versions: VersionSummary[] }> {
  const res = await apiClient.get(`/api/versions/${projectId}`);
  return res.data;
}

export async function downloadVersionHtmlApi(projectId: string, docId: string): Promise<Blob> {
  const res = await apiClient.get(`/api/generate/${projectId}/download`, {
    params: { docId },
    responseType: "blob",
  });
  return res.data;
}
