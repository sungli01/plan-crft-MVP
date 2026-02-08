'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import ProLock from '../../components/ProLock';
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
  
  // 실시간 진행 상황
  const [realtimeProgress, setRealtimeProgress] = useState<RealtimeProgress | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [estimatedDuration] = useState<number>(20 * 60 * 1000); // 20분 (밀리초)

  // 연구 데이터
  const [researchData, setResearchData] = useState<ResearchData | null>(null);

  // Collaboration panels
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // WebSocket 진행 상황
  const [wsProgress, setWsProgress] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fix: separate status tracking to avoid useEffect infinite loop
  const [projectStatus, setProjectStatus] = useState<string>('');
  const statusRef = useRef<string>('');
  const downloadMenuRef = useRef<HTMLDivElement>(null);

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

  const loadProjectData = useCallback(async () => {
    try {
      // 프로젝트 정보
      const projectResponse = await api.get(`/api/projects/${projectId}`);
      const projectData = projectResponse.data.project;
      setProject(projectData);
      setProjectStatus(projectData.status);
      statusRef.current = projectData.status;

      // Load research data if available
      if (projectData.researchData) {
        setResearchData(projectData.researchData);
      }

      // 생성 상태 확인 (실시간 진행 상황 포함)
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

      // Also check for research data in status response
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

      // Check if status changed
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

  // WebSocket for real-time progress
  useEffect(() => {
    if (projectStatus !== 'generating') return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace(/^http/, 'ws') + `/ws/progress/${projectId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Update progress based on message type
          if (data.type === 'research_search') {
            setWsProgress('🔬 학술 논문 검색 중...');
          } else if (data.type === 'research_analyze') {
            setWsProgress(`📊 ${data.count || 0}개 논문 분석 완료`);
          } else if (data.type === 'research_summary') {
            setWsProgress('📝 연구 결과 요약 중...');
          } else if (data.type === 'research_complete') {
            setWsProgress(null);
            if (data.researchData) {
              setResearchData(data.researchData);
            }
          } else if (data.type === 'progress') {
            if (data.progress) {
              setRealtimeProgress(data.progress);
            }
          } else if (data.type === 'status') {
            if (data.status && data.status !== statusRef.current) {
              statusRef.current = data.status;
              setProjectStatus(data.status);
              // Reload full project data on status change
              loadProjectData();
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
        // Fall back to polling (handled below)
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
      };

      return () => {
        ws.close();
        wsRef.current = null;
      };
    } catch {
      setWsConnected(false);
      // Fall back to polling
    }
  }, [projectStatus, projectId, loadProjectData]);

  // Polling — only when generating AND WebSocket is not connected, 3s interval
  useEffect(() => {
    if (projectStatus !== 'generating') return;
    if (wsConnected) return; // Skip polling when WS is connected
    
    const interval = setInterval(() => {
      pollStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [projectStatus, projectId, pollStatus, wsConnected]);

  const calculateTimeProgress = () => {
    if (!realtimeProgress) return 0;
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / estimatedDuration) * 100, 99);
    return Math.round(progress);
  };

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

  const handleDownloadHtml = async () => {
    setShowDownloadMenu(false);
    setDownloading(true);
    try {
      const response = await api.get(`/api/generate/${projectId}/download`, {
        responseType: 'blob'
      });

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

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    setTimeout(() => {
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: '요청을 확인했습니다. AI 에이전트에게 전달하겠습니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    
    setTimeout(() => {
      const systemMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: `📎 "${file.name}" 파일을 받았습니다. AI 에이전트가 참고하여 작업을 진행합니다.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
      setUploadingFile(false);
    }, 1500);
  };

  const getUser = () => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  };

  const getStatusDisplay = (status: string) => {
    const displays = {
      draft: { text: '초안', color: 'gray', icon: '📝' },
      generating: { text: '생성 중', color: 'yellow', icon: '⏳' },
      completed: { text: '완료', color: 'green', icon: '✅' },
      failed: { text: '실패', color: 'red', icon: '❌' }
    };
    return displays[status as keyof typeof displays] || displays.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">프로젝트를 찾을 수 없습니다</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            프로젝트 목록으로 이동
          </button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(project.status);
  const user = getUser();
  const timeProgress = calculateTimeProgress();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 헤더 */}
      <Header />

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 */}
        <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* 프로젝트 제목 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => router.push('/projects')}
              className="text-blue-600 hover:text-blue-700 text-sm mb-2"
            >
              ← 프로젝트 목록
            </button>
            <h2 className="font-semibold text-base text-gray-900 dark:text-white">{project.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl">{statusDisplay.icon}</span>
              <span className={`text-sm font-semibold text-${statusDisplay.color}-700`}>
                {statusDisplay.text}
              </span>
            </div>
          </div>

          {/* 진행 시간 (시간 기반) */}
          {project.status === 'generating' && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">⏱️ 진행 시간</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">경과 시간</span>
                  <span className="font-semibold text-blue-600">{getElapsedTime()}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${timeProgress}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">예상 소요: 20분</span>
                  <span className="text-gray-600 dark:text-gray-400">남은 시간: {getEstimatedRemaining()}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI 에이전트 진행 현황 */}
          {realtimeProgress && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">🤖 AI 에이전트</h3>
              <div className="space-y-3">
                {Object.entries(realtimeProgress.agents).map(([key, agent]: [string, any]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {key === 'architect' ? 'Architect' :
                         key === 'writer' ? 'Writer' :
                         key === 'imageCurator' ? 'Image Curator' :
                         key === 'reviewer' ? 'Reviewer' : key}
                      </span>
                      <span className={`font-semibold ${
                        agent.status === 'completed' ? 'text-green-600' :
                        agent.status === 'running' ? 'text-blue-600' :
                        'text-gray-400'
                      }`}>
                        {agent.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          agent.status === 'completed' ? 'bg-green-600' :
                          agent.status === 'running' ? 'bg-blue-600' :
                          'bg-gray-300 dark:bg-gray-600'
                        }`}
                        style={{ width: `${agent.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{agent.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 실시간 작업 로그 */}
          <div className="flex-1 flex flex-col overflow-hidden border-b border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">🔄 실시간 로그</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2 font-mono text-xs">
                {realtimeProgress?.logs?.length ? (
                  realtimeProgress.logs.slice().reverse().map((log: ProgressLog, idx: number) => (
                    <div key={idx} className={`flex items-start gap-2 ${
                      log.level === 'success' ? 'text-green-600' :
                      log.level === 'error' ? 'text-red-600' :
                      log.level === 'info' ? 'text-blue-600' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      <span className="mt-0.5">
                        {log.level === 'success' ? '✓' :
                         log.level === 'error' ? '✗' :
                         log.level === 'info' ? '⏳' : '○'}
                      </span>
                      <div className="flex-1">
                        <span className="font-semibold">[{log.time}]</span> {log.message}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    작업 대기 중...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 소통 영역 */}
          <div className="flex-shrink-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">💬 AI와 소통</h3>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="추가 요청..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  전송
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="additional-file"
                  accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                <label
                  htmlFor="additional-file"
                  className={`flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition ${
                    uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span>📎</span>
                  <span>{uploadingFile ? '업로드 중...' : '파일 추가'}</span>
                </label>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="px-4 pb-4 max-h-32 overflow-y-auto border-t border-gray-200 dark:border-gray-700 pt-2">
                {messages.slice(-3).map(msg => (
                  <div key={msg.id} className="text-xs mb-2">
                    <span className={`font-semibold ${msg.type === 'user' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      {msg.type === 'user' ? '👤' : '🤖'}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 ml-1">{msg.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* 프로젝트 정보 - 단순화 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">{project.title}</h1>
                  {project.deepResearch && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full">
                      Pro
                    </span>
                  )}
                  {project.status === 'completed' && (
                    <div className="relative" ref={downloadMenuRef}>
                      <button
                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                        disabled={downloading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {downloading ? '다운로드 중...' : '📥 다운로드'}
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showDownloadMenu && (
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20">
                          <button
                            onClick={handleDownloadHtml}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-t-lg flex items-center gap-2"
                          >
                            📄 HTML 다운로드
                          </button>
                          <button
                            onClick={handleDownloadPdf}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-b-lg flex items-center gap-2"
                          >
                            📑 PDF로 저장
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.idea}</p>
              </div>
            </div>
          </div>

          {/* Collaboration Toolbar */}
          {project.status === 'completed' && (
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition shadow-sm"
              >
                🔗 공유
              </button>
              <button
                onClick={() => setShowCommentPanel(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition shadow-sm"
              >
                💬 댓글
              </button>
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition shadow-sm"
              >
                📋 버전
              </button>
            </div>
          )}

          {/* Research Panel - shown above document when data exists */}
          <ResearchPanel data={researchData} />

          {/* WebSocket research progress */}
          {wsProgress && project.status === 'generating' && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                {wsProgress}
              </span>
            </div>
          )}

          {/* 실시간 생성 문서 내용 */}
          {project.status === 'generating' && realtimeProgress && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📝 생성 중인 문서</h3>
              <div className="space-y-4">
                {(realtimeProgress.agents as any).writer?.currentSection && (
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      섹션 {(realtimeProgress.agents as any).writer.currentSection}/{(realtimeProgress.agents as any).writer.totalSections}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      현재 작성 중: {(realtimeProgress.agents as any).writer.detail}
                    </p>
                    <div className="mt-2 bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm text-gray-700 dark:text-gray-300">
                      <p>AI가 문서를 작성하고 있습니다...</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        * 실시간 내용은 완료 후 확인하실 수 있습니다
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 문서 통계 (완료 시) */}
          {document && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 문서 통계</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {document.qualityScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">품질 점수</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {document.sectionCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">섹션</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {document.wordCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">단어</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {document.imageCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">이미지</div>
                </div>
              </div>
            </div>
          )}

          {/* 완료 안내 */}
          {project.status === 'completed' && (
            <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
                ✅ 문서 생성 완료!
              </h3>
              <p className="text-green-800 dark:text-green-400">
                고품질 사업계획서가 성공적으로 생성되었습니다. 
                상단의 다운로드 버튼을 클릭하여 파일을 받으실 수 있습니다.
              </p>
            </div>
          )}

          {/* 목업 사이트 빌더 */}
          {project.status === 'completed' && (
            <div className="mt-6">
              <ProLock feature="목업 사이트 빌더" isPro={user?.plan === 'pro' || user?.plan === 'enterprise'}>
                <Link
                  href={`/project/${projectId}/mockup`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
                >
                  🎨 목업 사이트 생성
                </Link>
              </ProLock>
            </div>
          )}
        </main>
      </div>

      {/* Collaboration Panels */}
      <ShareModal
        projectId={projectId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      <CommentPanel
        projectId={projectId}
        isOpen={showCommentPanel}
        onClose={() => setShowCommentPanel(false)}
      />
      <VersionHistory
        projectId={projectId}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
      />
    </div>
  );
}
