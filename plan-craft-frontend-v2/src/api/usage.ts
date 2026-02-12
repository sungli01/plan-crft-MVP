import apiClient from "./client";

export interface UsageData {
  totalGenerations: number;
  monthlyGenerations: number;
  limit: number;
}

export async function getUsageApi(): Promise<UsageData> {
  const res = await apiClient.get("/api/usage");
  return res.data;
}
