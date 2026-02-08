'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import { useToast } from '../../components/Toast';
import ResearchPanel from '../../components/ResearchPanel';
import type { ResearchData } from '../../components/ResearchPanel';
import ShareModal from '../../components/ShareModal';
import CommentPanel from '../../components/CommentPanel';
import VersionHistory from '../../components/VersionHistory';
import api from '../../lib/api';
import type { Document as DocType, AgentProgress, ProgressLog, RealtimeProgress, Message } from '../../types';

interface ProjectData {
  id: string;
  title: string;
  idea: string;
  status: string;
  createdAt: string;
  deepResearch?: boolean;
  researchData?: ResearchData;
}

/* ── Agent visual config ─────────────────── */
const AGENT_CONFIG: Record<string, { icon: string; label: string; color: string; bgLight: string; bgDark: string; textLight: string; textDark: string; ringColor: string }> = {
  architect: {
    icon: '🏗️',
    label: 'Architect',
    color: 'blue',
    bgLight: 'bg-blue-100',
    bgDark: 'dark:bg-blue-900/40',
    textLight: 'text-blue-600',
    textDark: 'dark:text-blue-400',
    ringColor: 'ring-blue-500/30',
  },
  writer: {
    icon: '✍️',
    label: 'Writer',
    color: 'purple',
    bgLight: 'bg-purple-100',
    bgDark: 'dark:bg-purple-900/40',
    textLight: 'text-purple-600',
    textDark: 'dark:text-purple-400',
    ringColor: 'ring-purple-500/30',
  },
  imageCurator: {
    icon: '🎨',
    label: 'Image Curator',
    color: 'amber',
    bgLight: 'bg-amber-100',
    bgDark: 'dark:bg-amber-900/40',
    textLight: 'text-amber-600',
    textDark: 'dark:text-amber-400',
    ringColor: 'ring-amber-500/30',
  },
  reviewer: {
    icon: '🔍',
    label: 'Reviewer',
    color: 'green',
    bgLight: 'bg-green-100',
    bgDark: 'dark:bg-green-900/40',
    textLight: 'text-green-600',
    textDark: 'dark:text-green-400',
    ringColor: 'ring-green-500/30',
  },
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { showToast } = useToast();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [document, setDocument] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Realtime progress
  const [realtimeProgress, setRealtimeProgress] = useState<RealtimeProgress | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [estimatedDuration] = useState<number>(20 * 60 * 1000);

  // Research
  const [researchData, setResearchData] = useState<ResearchData | null>(null);

  // Collaboration panels
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // WebSocket
  const [wsProgress, setWsProgress] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Status tracking
  const [projectStatus, setProjectStatus] = useState<string>('');
  const statusRef = useRef<string>('');
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Close download menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [realtimeProgress?.logs]);

  const loadProjectData = useCallback(async () => {
    try {
      const projectResponse = await api.get(`/api/projects/${projectId}`);
      const projectData = projectResponse.data.project;
      setProject(projectData);
      setProjectStatus(projectData.status);
      statusRef.current = projectData.status;

      if (projectData.researchData) {
        setResearchData(projectData.researchData);
      }

      const statusResponse = await api.get(`/api/generate/${projectId}/status`);

      if (statusResponse.data.progress) {
        setRealtimeProgress(statusResponse.data.progress);
        if (statusResponse.data.progress.startedAt) {
          setStartTime(statusResponse.data.progress.startedAt);
        }
      }

      if (statusResponse.data.document) {
        setDocument(statusResponse.data.document);
      }

      if (statusResponse.data.researchData) {
        setResearchData(statusResponse.data.researchData);
      }
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const pollStatus = useCallback(async () => {
    try {
      const statusResponse = await api.get(`/api/generate/${projectId}/status`);

      if (statusResponse.data.progress) {
        setRealtimeProgress(statusResponse.data.progress);
      }

      if (statusResponse.data.document) {
        setDocument(statusResponse.data.document);
      }

      const projectResponse = await api.get(`/api/projects/${projectId}`);
      const newStatus = projectResponse.data.project.status;
      if (newStatus !== statusRef.current) {
        statusRef.current = newStatus;
        setProjectStatus(newStatus);
        setProject(projectResponse.data.project);
      }
    } catch (error) {
      console.error('상태 확인 실패:', error);
    }
  }, [projectId]);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadProjectData();
  }, [projectId, loadProjectData, router]);

  // WebSocket
  useEffect(() => {
    if (projectStatus !== 'generating') return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace(/^http/, 'ws') + `/ws/progress/${projectId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'research_search') {
            setWsProgress('🔬 학술 논문 검색 중...');
          } else if (data.type === 'research_analyze') {
            setWsProgress(`📊 ${data.count || 0}개 논문 분석 완료`);
          } else if (data.type === 'research_summary') {
            setWsProgress('📝 연구 결과 요약 중...');
          } else if (data.type === 'research_complete') {
            setWsProgress(null);
            if (data.researchData) setResearchData(data.researchData);
          } else if (data.type === 'progress') {
            if (data.progress) setRealtimeProgress(data.progress);
          } else if (data.type === 'status') {
            if (data.status && data.status !== statusRef.current) {
              statusRef.current = data.status;
              setProjectStatus(data.status);
              loadProjectData();
            }
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => { setWsConnected(false); wsRef.current = null; };

      return () => { ws.close(); wsRef.current = null; };
    } catch {
      setWsConnected(false);
    }
  }, [projectStatus, projectId, loadProjectData]);

  // Polling fallback
  useEffect(() => {
    if (projectStatus !== 'generating') return;
    if (wsConnected) return;

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [projectStatus, projectId, pollStatus, wsConnected]);

  /* ── Helpers ─────────────────── */
  const getElapsedTime = () => {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEstimatedRemaining = () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(estimatedDuration - elapsed, 0);
    const minutes = Math.floor(remaining / 60000);
    return `약 ${minutes}분`;
  };

  const getOverallProgress = (): number => {
    if (!realtimeProgress) return 0;
    if (realtimeProgress.overallProgress) return realtimeProgress.overallProgress;
    const agents = Object.values(realtimeProgress.agents);
    if (agents.length === 0) return 0;
    return Math.round(agents.reduce((sum, a: any) => sum + (a.progress || 0), 0) / agents.length);
  };

  const handleDownloadHtml = async () => {
    setShowDownloadMenu(false);
    setDownloading(true);
    try {
      const response = await api.get(`/api/generate/${projectId}/download`, { responseType: 'blob' });
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = window.document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${project?.title || 'document'}.html`);
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('다운로드 실패:', error);
      showToast('다운로드에 실패했습니다', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = () => {
    setShowDownloadMenu(false);
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.open(`${apiUrl}/api/generate/${projectId}/download/pdf?token=${token}`, '_blank');
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const newMessage: Message = { id: Date.now().toString(), type: 'user', content: inputMessage, timestamp: new Date() };
    setMessages([...messages, newMessage]);
    setInputMessage('');
    setTimeout(() => {
      const systemMessage: Message = { id: (Date.now() + 1).toString(), type: 'system', content: '요청을 확인했습니다. AI 에이전트에게 전달하겠습니다.', timestamp: new Date() };
      setMessages(prev => [...prev, systemMessage]);
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setTimeout(() => {
      const systemMessage: Message = { id: Date.now().toString(), type: 'system', content: `📎 "${file.name}" 파일을 받았습니다. AI 에이전트가 참고하여 작업을 진행합니다.`, timestamp: new Date() };
      setMessages(prev => [...prev, systemMessage]);
      setUploadingFile(false);
    }, 1500);
  };

  const getUser = () => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem('user');
    if (userData) return JSON.parse(userData);
    return null;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { text: string; icon: string; bg: string; text_color: string; border: string; dot: string }> = {
      draft: { text: '초안', icon: '📝', bg: 'bg-gray-100 dark:bg-gray-700', text_color: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', dot: 'bg-gray-400' },
      generating: { text: '생성 중', icon: '⚡', bg: 'bg-amber-50 dark:bg-amber-900/20', text_color: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-500 animate-pulse' },
      completed: { text: '완료', icon: '✅', bg: 'bg-green-50 dark:bg-green-900/20', text_color: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700', dot: 'bg-green-500' },
      failed: { text: '실패', icon: '❌', bg: 'bg-red-50 dark:bg-red-900/20', text_color: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', dot: 'bg-red-500' },
    };
    return configs[status] || configs.draft;
  };

  /* ── Render ─────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">프로젝트 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">삭제되었거나 잘못된 링크입니다</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            프로젝트 목록으로 이동
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(project.status);
  const user = getUser();
  const overallProgress = getOverallProgress();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      <Header />

      {/* ── Top Bar: Title + Status + Actions ───────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8">
        <div className="max-w-screen-2xl mx-auto py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: back + title + status */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push('/projects')}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{project.title}</h1>
                  {project.deepResearch && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold rounded-full">
                      PRO
                    </span>
                  )}
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text_color} ${statusConfig.border}`}>
                    <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {project.status === 'completed' && (
                <>
                  <button onClick={() => setShowShareModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    공유
                  </button>
                  <button onClick={() => setShowCommentPanel(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    댓글
                  </button>
                  <button onClick={() => setShowVersionHistory(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    버전
                  </button>
                  <div className="relative" ref={downloadMenuRef}>
                    <button
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      disabled={downloading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                    >
                      {downloading ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          다운로드 중...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          다운로드
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </>
                      )}
                    </button>
                    {showDownloadMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-20 overflow-hidden">
                        <button onClick={handleDownloadHtml} className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 transition">
                          <span className="text-base">📄</span> HTML 다운로드
                        </button>
                        <button onClick={handleDownloadPdf} className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 transition border-t border-gray-100 dark:border-gray-600">
                          <span className="text-base">📑</span> PDF로 저장
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Overall progress bar for generating */}
          {project.status === 'generating' && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <span>⏱️ {getElapsedTime()}</span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>남은 시간: {getEstimatedRemaining()}</span>
                  {wsConnected && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        실시간 연결
                      </span>
                    </>
                  )}
                </div>
                <span className="font-bold text-blue-600 dark:text-blue-400">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 transition-all duration-700 ease-out relative"
                  style={{ width: `${overallProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content area ───────── */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
          {/* Generating state: split layout */}
          {project.status === 'generating' && (
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* Left: Log Terminal */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Research progress */}
                {wsProgress && (
                  <div className="mb-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent" />
                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{wsProgress}</span>
                  </div>
                )}

                <div className="flex-1 bg-gray-900 dark:bg-gray-950 rounded-xl border border-gray-700 dark:border-gray-800 overflow-hidden shadow-xl flex flex-col min-h-[400px]">
                  {/* Terminal header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-800">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/80" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <span className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-gray-400 font-mono ml-2">실시간 작업 로그</span>
                  </div>

                  {/* Log content */}
                  <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed">
                    {realtimeProgress?.logs?.length ? (
                      realtimeProgress.logs.map((log: ProgressLog, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 py-1 hover:bg-gray-800/50 rounded px-2 -mx-2 transition">
                          <span className="text-gray-500 text-xs mt-0.5 flex-shrink-0 tabular-nums w-14">{log.time}</span>
                          <span className={`flex-shrink-0 mt-0.5 ${
                            log.level === 'success' ? 'text-green-400' :
                            log.level === 'error' ? 'text-red-400' :
                            log.level === 'info' ? 'text-blue-400' :
                            'text-gray-500'
                          }`}>
                            {log.level === 'success' ? '✓' :
                             log.level === 'error' ? '✗' :
                             log.level === 'info' ? '▸' : '·'}
                          </span>
                          <span className={`flex-1 ${
                            log.level === 'success' ? 'text-green-300' :
                            log.level === 'error' ? 'text-red-300' :
                            log.level === 'info' ? 'text-blue-200' :
                            'text-gray-400'
                          }`}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <div className="text-3xl mb-3 animate-pulse">⚡</div>
                          <p className="text-sm">작업 대기 중...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Communication area */}
                <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="AI 에이전트에게 추가 요청..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <button onClick={handleSendMessage} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                      전송
                    </button>
                    <div className="relative">
                      <input type="file" onChange={handleFileUpload} className="hidden" id="additional-file" accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg" />
                      <label htmlFor="additional-file" className={`flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition ${uploadingFile ? 'opacity-50' : ''}`}>
                        📎
                      </label>
                    </div>
                  </div>
                  {messages.length > 0 && (
                    <div className="mt-3 max-h-24 overflow-y-auto space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-3">
                      {messages.slice(-3).map(msg => (
                        <div key={msg.id} className="flex items-start gap-2 text-xs">
                          <span className={`flex-shrink-0 ${msg.type === 'user' ? 'text-blue-500' : 'text-gray-400'}`}>
                            {msg.type === 'user' ? '👤' : '🤖'}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">{msg.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Agent Status Cards */}
              <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4">
                {realtimeProgress && Object.entries(realtimeProgress.agents).map(([key, agent]: [string, any]) => {
                  const config = AGENT_CONFIG[key] || { icon: '🤖', label: key, bgLight: 'bg-gray-100', bgDark: 'dark:bg-gray-700', textLight: 'text-gray-600', textDark: 'dark:text-gray-400', ringColor: 'ring-gray-500/30' };
                  const isRunning = agent.status === 'running';
                  const isCompleted = agent.status === 'completed';
                  const isFailed = agent.status === 'failed';

                  return (
                    <div
                      key={key}
                      className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-5 transition-all duration-300 ${
                        isRunning ? `border-${config.color}-300 dark:border-${config.color}-700 shadow-lg ring-4 ${config.ringColor}` :
                        isCompleted ? 'border-green-300 dark:border-green-700 shadow-sm' :
                        isFailed ? 'border-red-300 dark:border-red-700 shadow-sm' :
                        'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${config.bgLight} ${config.bgDark} flex items-center justify-center text-lg ${isRunning ? 'animate-pulse' : ''}`}>
                            {isCompleted ? '✅' : isFailed ? '❌' : config.icon}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{config.label}</span>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-[160px] truncate">{agent.detail || '대기 중'}</p>
                          </div>
                        </div>
                        <span className={`text-lg font-bold tabular-nums ${
                          isCompleted ? 'text-green-600 dark:text-green-400' :
                          isRunning ? `${config.textLight} ${config.textDark}` :
                          isFailed ? 'text-red-600 dark:text-red-400' :
                          'text-gray-300 dark:text-gray-600'
                        }`}>
                          {agent.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-green-500' :
                            isRunning ? `bg-gradient-to-r from-${config.color}-500 to-${config.color}-400` :
                            isFailed ? 'bg-red-500' :
                            'bg-gray-300 dark:bg-gray-600'
                          }`}
                          style={{ width: `${agent.progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Generating info */}
                {realtimeProgress && (realtimeProgress.agents as any)?.writer?.currentSection && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">📝 현재 작성 중</h4>
                    <div className="border-l-3 border-purple-500 pl-3">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        섹션 {(realtimeProgress.agents as any).writer.currentSection}/{(realtimeProgress.agents as any).writer.totalSections}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(realtimeProgress.agents as any).writer.detail}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed / Other states */}
          {project.status !== 'generating' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Research Panel */}
              <ResearchPanel data={researchData} />

              {/* Document Stats */}
              {document && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">📈 문서 통계</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { value: document.qualityScore.toFixed(1), label: '품질 점수', color: 'blue', icon: '⭐' },
                      { value: document.sectionCount.toString(), label: '섹션', color: 'green', icon: '📑' },
                      { value: document.wordCount.toLocaleString(), label: '단어', color: 'purple', icon: '📝' },
                      { value: document.imageCount.toString(), label: '이미지', color: 'orange', icon: '🖼️' },
                    ].map((stat, i) => (
                      <div key={i} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-750 dark:bg-gray-900/50">
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <div className={`text-2xl font-extrabold text-${stat.color}-600 dark:text-${stat.color}-400 tabular-nums`}>
                          {stat.value}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Banner */}
              {project.status === 'completed' && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-900 dark:text-green-300">문서 생성 완료!</h3>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        고품질 사업계획서가 성공적으로 생성되었습니다.
                        상단의 다운로드 버튼을 클릭하여 파일을 받으실 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed Banner */}
              {project.status === 'failed' && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-900 dark:text-red-300">생성 중 오류 발생</h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        문서 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mockup Site Builder */}
              {project.status === 'completed' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  {(user?.plan === 'pro' || user?.plan === 'enterprise') ? (
                    <Link
                      href={`/project/${projectId}/mockup`}
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
                    >
                      🎨 목업 사이트 생성
                    </Link>
                  ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400">
                        <span>🔒</span>
                        <span>목업 사이트 생성은 Pro 플랜 전용 기능입니다</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Panels */}
      <ShareModal projectId={projectId} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      <CommentPanel projectId={projectId} isOpen={showCommentPanel} onClose={() => setShowCommentPanel(false)} />
      <VersionHistory projectId={projectId} isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />

      {/* Shimmer animation style */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
