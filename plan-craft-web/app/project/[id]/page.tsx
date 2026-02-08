'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '../../components/Toast';
import ResearchPanel from '../../components/ResearchPanel';
import type { ResearchData } from '../../components/ResearchPanel';
import ShareModal from '../../components/ShareModal';
import CommentPanel from '../../components/CommentPanel';
import VersionHistory from '../../components/VersionHistory';
import api from '../../lib/api';
import type { Document as DocType, AgentProgress, ProgressLog, RealtimeProgress, Message } from '../../types';

/* ─────────────────────────────────────────────
   Type helpers
   ───────────────────────────────────────────── */
interface ProjectData {
  id: string;
  title: string;
  idea: string;
  category?: string;
  status: string;
  createdAt: string;
  deepResearch?: boolean;
  researchData?: ResearchData;
}

/* ── Agent visual config ─────────────────── */
const AGENT_CONFIG: Record<string, { icon: string; label: string; gradient: string; bg: string; text: string; ring: string; border: string; dot: string }> = {
  architect: {
    icon: '🏗️', label: 'Architect', gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-400/30', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500',
  },
  writer: {
    icon: '✍️', label: 'Writer', gradient: 'from-purple-500 to-fuchsia-500',
    bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-400/30', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500',
  },
  imageCurator: {
    icon: '🎨', label: 'Image Curator', gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-400/30', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500',
  },
  reviewer: {
    icon: '🔍', label: 'Reviewer', gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-400/30', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500',
  },
};

/* ── Tool bar items ────────────────────────── */
const TOOL_ITEMS = [
  { icon: '📄', label: '사업계획서', key: 'plan' },
  { icon: '📊', label: '시장분석', key: 'market' },
  { icon: '🖼️', label: '이미지', key: 'image' },
  { icon: '📋', label: '데이터', key: 'data' },
  { icon: '🌐', label: '목업사이트', key: 'mockup' },
  { icon: '📎', label: '참고자료', key: 'ref' },
  { icon: '📥', label: '다운로드', key: 'download' },
];

/* ── Status tab filter ─────────────────────── */
type AgentTab = 'all' | 'running' | 'completed';

/* ═══════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════ */
export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { showToast } = useToast();

  /* ── State ─────────────────────────────── */
  const [project, setProject] = useState<ProjectData | null>(null);
  const [document, setDocument] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTool, setActiveTool] = useState('plan');

  // Realtime progress
  const [realtimeProgress, setRealtimeProgress] = useState<RealtimeProgress | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [estimatedDuration] = useState<number>(20 * 60 * 1000);

  // Research
  const [researchData, setResearchData] = useState<ResearchData | null>(null);

  // Right panel
  const [agentTab, setAgentTab] = useState<AgentTab>('all');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

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
  const contentRef = useRef<HTMLDivElement>(null);

  /* ── Close download menu on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Auto-scroll logs ── */
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [realtimeProgress?.logs]);

  /* ── Data loading ── */
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
      if (statusResponse.data.progress) setRealtimeProgress(statusResponse.data.progress);
      if (statusResponse.data.document) setDocument(statusResponse.data.document);

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

  /* ── Initial load ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    loadProjectData();
  }, [projectId, loadProjectData, router]);

  /* ── WebSocket ── */
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
          if (data.type === 'research_search') setWsProgress('🔬 학술 논문 검색 중...');
          else if (data.type === 'research_analyze') setWsProgress(`📊 ${data.count || 0}개 논문 분석 완료`);
          else if (data.type === 'research_summary') setWsProgress('📝 연구 결과 요약 중...');
          else if (data.type === 'research_complete') { setWsProgress(null); if (data.researchData) setResearchData(data.researchData); }
          else if (data.type === 'progress') { if (data.progress) setRealtimeProgress(data.progress); }
          else if (data.type === 'status') {
            if (data.status && data.status !== statusRef.current) {
              statusRef.current = data.status;
              setProjectStatus(data.status);
              loadProjectData();
            }
          }
        } catch { /* ignore */ }
      };
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => { setWsConnected(false); wsRef.current = null; };
      return () => { ws.close(); wsRef.current = null; };
    } catch { setWsConnected(false); }
  }, [projectStatus, projectId, loadProjectData]);

  /* ── Polling fallback ── */
  useEffect(() => {
    if (projectStatus !== 'generating' || wsConnected) return;
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [projectStatus, projectId, pollStatus, wsConnected]);

  /* ── Helpers ─────────────────────────── */
  const getElapsedTime = () => {
    const elapsed = Date.now() - startTime;
    const m = Math.floor(elapsed / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getOverallProgress = (): number => {
    if (!realtimeProgress) return 0;
    if (realtimeProgress.overallProgress) return realtimeProgress.overallProgress;
    const agents = Object.values(realtimeProgress.agents);
    if (agents.length === 0) return 0;
    return Math.round(agents.reduce((sum, a: any) => sum + (a.progress || 0), 0) / agents.length);
  };

  const getRunningCount = (): number => {
    if (!realtimeProgress) return 0;
    return Object.values(realtimeProgress.agents).filter((a: any) => a.status === 'running').length;
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
    } catch { showToast('다운로드에 실패했습니다', 'error'); }
    finally { setDownloading(false); }
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
    setMessages(prev => [...prev, newMessage]);
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

  /* ── Filtered agents for right panel ── */
  const getFilteredAgents = (): [string, any][] => {
    if (!realtimeProgress) return [];
    const entries = Object.entries(realtimeProgress.agents);
    if (agentTab === 'all') return entries;
    if (agentTab === 'running') return entries.filter(([, a]: [string, any]) => a.status === 'running');
    return entries.filter(([, a]: [string, any]) => a.status === 'completed');
  };

  const getCategoryLabel = () => project?.category || '범용';

  const overallProgress = getOverallProgress();
  const user = getUser();

  /* ─── Loading state ───────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">프로젝트 불러오는 중...</p>
        </div>
      </div>
    );
  }

  /* ─── Not found ───────────────────────── */
  if (!project) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">삭제되었거나 잘못된 링크입니다</p>
          <button onClick={() => router.push('/projects')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
            프로젝트 목록으로 이동
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — Skywork-style layout
     ═══════════════════════════════════════════ */
  return (
    <div className="h-screen flex flex-col bg-[#fafbfc] dark:bg-[#0a0a0f] overflow-hidden transition-colors">

      {/* ━━━━ TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="flex-shrink-0 h-14 bg-white dark:bg-[#12121a] border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 z-30">
        {/* Left cluster */}
        <button onClick={() => router.push('/projects')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <h1 className="text-base font-bold text-gray-900 dark:text-white truncate max-w-[280px] sm:max-w-md">{project.title}</h1>

        {project.deepResearch && (
          <span className="flex-shrink-0 px-1.5 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] font-bold rounded tracking-wide">PRO</span>
        )}

        <span className="flex-shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          {getCategoryLabel()}
        </span>

        {project.status === 'generating' && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            {getRunningCount()}개 진행 중
          </span>
        )}

        {project.status === 'completed' && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            완료
          </span>
        )}

        {wsConnected && (
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {project.status === 'completed' && (
            <>
              <button onClick={() => setShowShareModal(true)} className="h-8 px-3 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                <span className="hidden sm:inline">공유</span>
              </button>
              <button onClick={() => setShowCommentPanel(true)} className="h-8 px-3 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span className="hidden sm:inline">댓글</span>
              </button>
              <button onClick={() => setShowVersionHistory(true)} className="h-8 px-3 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span className="hidden sm:inline">버전</span>
              </button>

              {/* Download dropdown */}
              <div className="relative" ref={downloadMenuRef}>
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  disabled={downloading}
                  className="h-8 px-3.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {downloading ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  )}
                  <span className="hidden sm:inline">{downloading ? '다운로드 중...' : '다운로드'}</span>
                  {!downloading && <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>}
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#1e1e2a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <button onClick={handleDownloadHtml} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 transition">
                      <span>📄</span> HTML 다운로드
                    </button>
                    <button onClick={handleDownloadPdf} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 transition border-t border-gray-100 dark:border-gray-800">
                      <span>📑</span> PDF로 저장
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile toggle for right panel */}
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </header>

      {/* ━━━━ MAIN BODY — Left Content + Right Panel ━━━━ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ──── LEFT: Main Content Area ──── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Content scroll area */}
          <div ref={contentRef} className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

              {/* ═══ GENERATING STATE ═══ */}
              {project.status === 'generating' && (
                <div className="space-y-5">
                  {/* Overall progress hero */}
                  <div className="bg-white dark:bg-[#16161f] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-gray-900 dark:text-white">AI 에이전트 작업 중</h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">⏱️ {getElapsedTime()} 경과</p>
                        </div>
                      </div>
                      <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tabular-nums">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-700 ease-out relative" style={{ width: `${overallProgress}%` }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  </div>

                  {/* Research progress alert */}
                  {wsProgress && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent flex-shrink-0" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{wsProgress}</span>
                    </div>
                  )}

                  {/* AI Response / Live Terminal */}
                  <div className="bg-[#1a1a2e] dark:bg-[#0d0d14] rounded-2xl border border-gray-700 dark:border-gray-800 overflow-hidden shadow-xl">
                    {/* Terminal header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#141425] dark:bg-[#0a0a12] border-b border-gray-700/50">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono ml-2">실시간 작업 로그</span>
                      <div className="flex-1" />
                      {wsConnected && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          connected
                        </span>
                      )}
                    </div>

                    {/* Log content */}
                    <div ref={logContainerRef} className="h-[340px] overflow-y-auto p-4 font-mono text-[13px] leading-6 scrollbar-thin">
                      {realtimeProgress?.logs?.length ? (
                        realtimeProgress.logs.map((log: ProgressLog, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 py-0.5 hover:bg-white/[0.03] rounded px-2 -mx-2 transition">
                            <span className="text-gray-600 text-[11px] mt-0.5 flex-shrink-0 tabular-nums w-12">{log.time}</span>
                            <span className={`flex-shrink-0 mt-0.5 w-4 text-center ${
                              log.level === 'success' ? 'text-green-400' :
                              log.level === 'error' ? 'text-red-400' :
                              log.level === 'info' ? 'text-blue-400' : 'text-gray-600'
                            }`}>
                              {log.level === 'success' ? '✓' : log.level === 'error' ? '✗' : log.level === 'info' ? '▸' : '·'}
                            </span>
                            <span className={`flex-1 ${
                              log.level === 'success' ? 'text-green-300' :
                              log.level === 'error' ? 'text-red-300' :
                              log.level === 'info' ? 'text-blue-200' : 'text-gray-400'
                            }`}>{log.message}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <div className="text-3xl mb-3">⚡</div>
                            <p className="text-xs animate-pulse">에이전트 초기화 중...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chat messages */}
                  {messages.length > 0 && (
                    <div className="space-y-2">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                            msg.type === 'user'
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white dark:bg-[#1e1e2a] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ COMPLETED / OTHER STATES ═══ */}
              {project.status !== 'generating' && (
                <div className="space-y-6">
                  {/* Completion Banner */}
                  {project.status === 'completed' && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                          <span className="text-xl">🎉</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">문서 생성 완료!</h3>
                          <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                            고품질 사업계획서가 성공적으로 생성되었습니다. 상단의 다운로드 버튼으로 파일을 받을 수 있습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Failed Banner */}
                  {project.status === 'failed' && (
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20">
                          <span className="text-xl">⚠️</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-red-900 dark:text-red-200">생성 중 오류 발생</h3>
                          <p className="text-sm text-red-700 dark:text-red-400 mt-1">문서 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Research Panel */}
                  <ResearchPanel data={researchData} />

                  {/* Document Stats */}
                  {document && (
                    <div className="bg-white dark:bg-[#16161f] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                        <span>📈</span> 문서 통계
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { value: document.qualityScore.toFixed(1), label: '품질 점수', icon: '⭐', gradient: 'from-amber-500 to-orange-500' },
                          { value: document.sectionCount.toString(), label: '섹션', icon: '📑', gradient: 'from-blue-500 to-cyan-500' },
                          { value: document.wordCount.toLocaleString(), label: '단어', icon: '📝', gradient: 'from-purple-500 to-fuchsia-500' },
                          { value: document.imageCount.toString(), label: '이미지', icon: '🖼️', gradient: 'from-emerald-500 to-green-500' },
                        ].map((stat, i) => (
                          <div key={i} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                            <div className="text-2xl mb-2">{stat.icon}</div>
                            <div className={`text-2xl font-extrabold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent tabular-nums`}>{stat.value}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mockup Site */}
                  {project.status === 'completed' && (
                    <div className="bg-white dark:bg-[#16161f] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                      {(user?.plan === 'pro' || user?.plan === 'enterprise') ? (
                        <Link
                          href={`/project/${projectId}/mockup`}
                          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.005]"
                        >
                          🎨 목업 사이트 생성
                        </Link>
                      ) : (
                        <div className="text-center py-4">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs text-gray-500 dark:text-gray-400">
                            🔒 목업 사이트 생성은 Pro 플랜 전용 기능입니다
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat messages (completed state) */}
                  {messages.length > 0 && (
                    <div className="space-y-2">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                            msg.type === 'user'
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white dark:bg-[#1e1e2a] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ──── BOTTOM TOOL ICON BAR ──── */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12121a]">
            {/* Tool icons row */}
            <div className="px-4 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
              {TOOL_ITEMS.map(tool => (
                <button
                  key={tool.key}
                  onClick={() => {
                    setActiveTool(tool.key);
                    if (tool.key === 'download' && project.status === 'completed') setShowDownloadMenu(true);
                    if (tool.key === 'mockup' && project.status === 'completed') router.push(`/project/${projectId}/mockup`);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    activeTool === tool.key
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <span className="text-sm">{tool.icon}</span>
                  <span className="hidden sm:inline">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="px-4 pb-3 pt-1">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#1a1a26] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 dark:focus-within:border-blue-600 transition-all">
                {/* File upload */}
                <div className="flex-shrink-0">
                  <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload-bottom" accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg" />
                  <label htmlFor="file-upload-bottom" className={`w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  </label>
                </div>

                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="추가 요구사항을 입력하세요..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none py-1.5"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="flex-shrink-0 w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ──── RIGHT: Generation Panel (Sidebar) ──── */}
        <aside className={`flex-shrink-0 w-80 xl:w-[340px] border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12121a] flex flex-col overflow-hidden transition-all duration-300 ${
          rightPanelOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 top-14 bottom-0 z-20 shadow-2xl lg:translate-x-0 lg:relative lg:shadow-none'
        } hidden lg:flex`}>

          {/* Panel header */}
          <div className="flex-shrink-0 px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                생성
              </h2>
              {project.status === 'generating' && (
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">{overallProgress}%</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 transition-all duration-700 ease-out relative"
                style={{ width: `${project.status === 'completed' ? 100 : overallProgress}%` }}
              >
                {project.status === 'generating' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800/80 p-0.5">
              {(['all', 'running', 'completed'] as AgentTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAgentTab(tab)}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all ${
                    agentTab === tab
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'all' ? '전체' : tab === 'running' ? '진행 중' : '완료'}
                </button>
              ))}
            </div>
          </div>

          {/* Agent cards (scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3 scrollbar-thin">
            {getFilteredAgents().length === 0 && !realtimeProgress && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <div className="text-3xl mb-3">🤖</div>
                <p className="text-xs">에이전트 대기 중</p>
              </div>
            )}

            {getFilteredAgents().length === 0 && realtimeProgress && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p className="text-xs">해당하는 에이전트가 없습니다</p>
              </div>
            )}

            {getFilteredAgents().map(([key, agent]: [string, any]) => {
              const config = AGENT_CONFIG[key] || {
                icon: '🤖', label: key, gradient: 'from-gray-500 to-gray-600',
                bg: 'bg-gray-50 dark:bg-gray-900', text: 'text-gray-600 dark:text-gray-400',
                ring: 'ring-gray-400/30', border: 'border-gray-200 dark:border-gray-700', dot: 'bg-gray-500',
              };
              const isRunning = agent.status === 'running';
              const isCompleted = agent.status === 'completed';
              const isFailed = agent.status === 'failed';

              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 transition-all duration-300 ${
                    isRunning
                      ? `${config.border} bg-white dark:bg-[#16161f] shadow-md ring-2 ${config.ring}`
                      : isCompleted
                      ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : isFailed
                      ? 'border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#16161f]'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${
                      isRunning ? `bg-gradient-to-br ${config.gradient} shadow-sm` :
                      isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/50' :
                      isFailed ? 'bg-red-100 dark:bg-red-900/50' :
                      'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {isCompleted ? <span className="text-emerald-600 dark:text-emerald-400 text-sm">✓</span> :
                       isFailed ? <span className="text-red-600 dark:text-red-400 text-sm">✗</span> :
                       <span className={isRunning ? 'drop-shadow-sm' : ''}>{config.icon}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{config.label}</span>
                        {/* Status badge */}
                        {isRunning && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                            진행 중
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                            완료
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">실패</span>
                        )}
                        {agent.status === 'pending' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">대기</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{agent.detail || '대기 중'}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${
                      isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                      isRunning ? config.text :
                      'text-gray-300 dark:text-gray-600'
                    }`}>{agent.progress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' :
                        isRunning ? `bg-gradient-to-r ${config.gradient}` :
                        isFailed ? 'bg-red-500' :
                        'bg-gray-200 dark:bg-gray-700'
                      }`}
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>

                  {/* Section progress (writer) */}
                  {key === 'writer' && agent.currentSection && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                      <span>📝</span>
                      <span>콘텐츠 제작 {agent.currentSection}/{agent.totalSections}</span>
                    </div>
                  )}

                  {/* Tags */}
                  {isRunning && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">MCP 도구</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">AI 생성</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Compact real-time log at bottom of sidebar */}
            {realtimeProgress?.logs && realtimeProgress.logs.length > 0 && (
              <div className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                <h4 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">최근 로그</h4>
                <div className="space-y-1">
                  {realtimeProgress.logs.slice(-5).map((log, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                      <span className={`mt-0.5 flex-shrink-0 ${
                        log.level === 'success' ? 'text-emerald-500' :
                        log.level === 'error' ? 'text-red-500' :
                        log.level === 'info' ? 'text-blue-500' : 'text-gray-400'
                      }`}>
                        {log.level === 'success' ? '●' : log.level === 'error' ? '●' : log.level === 'info' ? '●' : '○'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 leading-tight line-clamp-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Mobile right panel overlay ── */}
        {rightPanelOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRightPanelOpen(false)} />
            <aside className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-[#12121a] border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
              {/* Close */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">생성</h2>
                <button onClick={() => setRightPanelOpen(false)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Progress bar */}
              <div className="px-5 pb-3">
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 transition-all duration-700"
                    style={{ width: `${project.status === 'completed' ? 100 : overallProgress}%` }}
                  />
                </div>
                {/* Tabs */}
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800/80 p-0.5">
                  {(['all', 'running', 'completed'] as AgentTab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setAgentTab(tab)}
                      className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all ${
                        agentTab === tab
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {tab === 'all' ? '전체' : tab === 'running' ? '진행 중' : '완료'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent cards */}
              <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
                {getFilteredAgents().map(([key, agent]: [string, any]) => {
                  const config = AGENT_CONFIG[key] || { icon: '🤖', label: key, gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-600', ring: 'ring-gray-400/30', border: 'border-gray-200', dot: 'bg-gray-500' };
                  const isRunning = agent.status === 'running';
                  const isCompleted = agent.status === 'completed';
                  return (
                    <div key={key} className={`rounded-xl border p-3.5 transition-all ${
                      isRunning ? `${config.border} bg-white dark:bg-[#16161f] shadow-md ring-2 ${config.ring}` :
                      isCompleted ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20' :
                      'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#16161f]'
                    }`}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${isRunning ? `bg-gradient-to-br ${config.gradient}` : isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          {isCompleted ? '✓' : config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{config.label}</span>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{agent.detail || '대기 중'}</p>
                        </div>
                        <span className="text-xs font-bold tabular-nums">{agent.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : isRunning ? `bg-gradient-to-r ${config.gradient}` : 'bg-gray-200 dark:bg-gray-700'}`} style={{ width: `${agent.progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ━━━━ MODALS ━━━━ */}
      <ShareModal projectId={projectId} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      <CommentPanel projectId={projectId} isOpen={showCommentPanel} onClose={() => setShowCommentPanel(false)} />
      <VersionHistory projectId={projectId} isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />

      {/* ━━━━ ANIMATIONS ━━━━ */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.4); }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
