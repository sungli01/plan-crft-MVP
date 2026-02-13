import { useState, useEffect, useCallback, useRef } from "react";
import {
  startGenerateApi,
  regenerateApi,
  getGenerateStatusApi,
  downloadGeneratedApi,
  downloadPptxApi,
  getPresentationUrl,
  type GenerateStatus,
} from "@/api/generate";
import { toast } from "sonner";
import {
  saveGeneratingState,
  clearGeneratingState,
  loadGeneratingState,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/generation-persist";

interface UseGenerateOptions {
  onComplete?: (status: GenerateStatus) => void;
  onError?: (error: string) => void;
  pollIntervalMs?: number;
}

export function useGenerate(options: UseGenerateOptions = {}) {
  const { onComplete, onError, pollIntervalMs = 5000 } = options;
  const [status, setStatus] = useState<GenerateStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Calculate overall progress from agent statuses
  const getOverallProgress = useCallback((s: GenerateStatus): number => {
    if (s.status === "completed") return 100;
    if (s.status === "draft") return 0;
    const agents = s.progress?.agents;
    if (!agents) return 10;
    const agentList = Object.values(agents);
    if (agentList.length === 0) return 10;
    const total = agentList.reduce((sum, a) => sum + (a.progress || 0), 0);
    return Math.round(total / agentList.length);
  }, []);

  const getCurrentStep = useCallback((s: GenerateStatus): string => {
    if (s.status === "completed") return "완료";
    if (s.status === "failed") return "실패";
    const agents = s.progress?.agents;
    if (!agents) return "시작 중...";
    // Find currently running agent
    const running = Object.entries(agents).find(([, a]) => a.status === "running");
    if (running) {
      const [name, agent] = running;
      const nameMap: Record<string, string> = {
        architect: "문서 구조 설계",
        writer: "내용 작성",
        imageCurator: "이미지 수집",
        reviewer: "품질 검토",
      };
      return `${nameMap[name] || name}: ${agent.detail || `${agent.progress}%`}`;
    }
    return "처리 중...";
  }, []);

  const pollStatus = useCallback(async (projectId: string) => {
    try {
      const s = await getGenerateStatusApi(projectId);
      setStatus(s);

      if (s.status === "completed") {
        stopPolling();
        setIsGenerating(false);
        clearGeneratingState();
        toast.success(`문서 생성 완료! 품질 점수: ${s.document?.qualityScore?.toFixed(1) || "N/A"}/100`);
        showBrowserNotification(
          "📄 문서 생성 완료!",
          `품질 점수: ${s.document?.qualityScore?.toFixed(1) || "N/A"}/100`
        );
        onComplete?.(s);
      } else if (s.status === "failed") {
        stopPolling();
        setIsGenerating(false);
        clearGeneratingState();
        const errMsg = s.error || "문서 생성에 실패했습니다.";
        toast.error(errMsg);
        showBrowserNotification("❌ 문서 생성 실패", errMsg);
        onError?.(errMsg);
      }
    } catch (error: any) {
      console.error("Polling error:", error);
    }
  }, [onComplete, onError, stopPolling]);

  const startPollingFor = useCallback((projectId: string) => {
    stopPolling();
    setIsGenerating(true);
    requestNotificationPermission();

    pollRef.current = setInterval(() => {
      pollStatus(projectId);
    }, pollIntervalMs);

    // Poll immediately
    setTimeout(() => pollStatus(projectId), 1000);
  }, [pollStatus, pollIntervalMs, stopPolling]);

  const startGenerate = useCallback(async (projectId: string, projectTitle?: string) => {
    try {
      setIsGenerating(true);
      setStatus(null);
      requestNotificationPermission();

      await startGenerateApi(projectId);

      // Persist state
      saveGeneratingState({
        projectId,
        projectTitle,
        startedAt: new Date().toISOString(),
        status: "generating",
      });

      // Start polling
      startPollingFor(projectId);
    } catch (error: any) {
      setIsGenerating(false);
      const message = error.response?.data?.message || error.response?.data?.error || "문서 생성 요청에 실패했습니다.";
      toast.error(message);
      onError?.(message);
    }
  }, [startPollingFor, onError]);

  const download = useCallback(async (projectId: string, preview = false) => {
    try {
      const blob = await downloadGeneratedApi(projectId);
      const url = URL.createObjectURL(blob);

      if (preview) {
        window.open(url, '_blank');
        toast.success("문서가 새 탭에서 열렸습니다.");
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${projectId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        toast.success("다운로드 완료! 📂", {
          description: "브라우저 상단 또는 알림바에서 다운로드된 파일을 확인하세요.",
          duration: 5000,
        });
      } else {
        toast.success("다운로드가 시작되었습니다.");
      }
    } catch (error: any) {
      toast.error("다운로드에 실패했습니다.");
    }
  }, []);

  const regenerate = useCallback(async (projectId: string, projectTitle?: string) => {
    try {
      stopPolling();
      setIsGenerating(true);
      setStatus(null);

      await regenerateApi(projectId);

      // Persist state
      saveGeneratingState({
        projectId,
        projectTitle,
        startedAt: new Date().toISOString(),
        status: "generating",
      });

      // Start polling
      startPollingFor(projectId);
    } catch (error: any) {
      setIsGenerating(false);
      const message = error.response?.data?.message || error.response?.data?.error || "재생성 요청에 실패했습니다.";
      toast.error(message);
      onError?.(message);
    }
  }, [startPollingFor, onError, stopPolling]);

  const downloadPptx = useCallback(async (projectId: string) => {
    try {
      const blob = await downloadPptxApi(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presentation-${projectId}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        toast.success("PPT 다운로드 완료! 📂", {
          description: "브라우저 상단 또는 알림바에서 파일을 확인하세요.",
          duration: 5000,
        });
      } else {
        toast.success("PPT 다운로드가 시작되었습니다.");
      }
    } catch (error: any) {
      toast.error("PPT 파일이 없거나 만료되었습니다.");
    }
  }, []);

  const openPresentation = useCallback((projectId: string) => {
    const url = getPresentationUrl(projectId);
    window.open(url, '_blank');
    toast.success("발표자료가 새 탭에서 열렸습니다.", {
      description: "PDF로 저장하려면 Ctrl+P (Mac: ⌘+P) → PDF로 저장",
      duration: 6000,
    });
  }, []);

  /**
   * Resume polling for an in-progress generation (e.g. after page revisit).
   * Call this from the page component when localStorage indicates generating.
   */
  const resumePolling = useCallback((projectId: string) => {
    startPollingFor(projectId);
  }, [startPollingFor]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    status,
    isGenerating,
    progress: status ? getOverallProgress(status) : 0,
    currentStep: status ? getCurrentStep(status) : "",
    document: status?.document || null,
    startGenerate,
    regenerate,
    download,
    downloadPptx,
    openPresentation,
    stopPolling,
    resumePolling,
  };
}
