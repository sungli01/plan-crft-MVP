import { useState, useEffect, useCallback, useRef } from "react";
import {
  startGenerateApi,
  getGenerateStatusApi,
  downloadGeneratedApi,
  type GenerateStatus,
} from "@/api/generate";
import { toast } from "sonner";

interface UseGenerateOptions {
  onComplete?: (result: string) => void;
  onError?: (error: string) => void;
  pollIntervalMs?: number;
}

export function useGenerate(options: UseGenerateOptions = {}) {
  const { onComplete, onError, pollIntervalMs = 2000 } = options;
  const [status, setStatus] = useState<GenerateStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const projectIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (projectId: string) => {
    try {
      const s = await getGenerateStatusApi(projectId);
      setStatus(s);

      if (s.status === "completed") {
        stopPolling();
        setIsGenerating(false);
        onComplete?.(s.result || "");
      } else if (s.status === "failed") {
        stopPolling();
        setIsGenerating(false);
        const errMsg = s.error || "문서 생성에 실패했습니다.";
        toast.error(errMsg);
        onError?.(errMsg);
      }
    } catch (error: any) {
      // Don't stop polling on transient errors
      console.error("Polling error:", error);
    }
  }, [onComplete, onError, stopPolling]);

  const startGenerate = useCallback(async (projectId: string, data?: any) => {
    try {
      setIsGenerating(true);
      setStatus({ status: "pending", progress: 0 });
      projectIdRef.current = projectId;

      await startGenerateApi(projectId, data);

      // Start polling
      pollRef.current = setInterval(() => {
        pollStatus(projectId);
      }, pollIntervalMs);

      // Also poll immediately
      await pollStatus(projectId);
    } catch (error: any) {
      setIsGenerating(false);
      const message = error.response?.data?.message || "문서 생성 요청에 실패했습니다.";
      toast.error(message);
      onError?.(message);
    }
  }, [pollStatus, pollIntervalMs, onError]);

  const download = useCallback(async (projectId: string) => {
    try {
      const blob = await downloadGeneratedApi(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("다운로드가 시작되었습니다.");
    } catch (error: any) {
      toast.error("다운로드에 실패했습니다.");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    status,
    isGenerating,
    progress: status?.progress || 0,
    currentStep: status?.step || "",
    startGenerate,
    download,
    stopPolling,
  };
}
