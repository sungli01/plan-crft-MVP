'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Project {
  id: string;
  title: string;
  idea: string;
  status: string;
  createdAt: string;
}

interface Document {
  id: string;
  qualityScore: number;
  sectionCount: number;
  wordCount: number;
  imageCount: number;
  createdAt: string;
}

interface Message {
  id: string;
  type: 'user' | 'system';
  content: string;
  timestamp: Date;
}

interface ProgressStep {
  agent: string;
  step: string;
  status: 'pending' | 'running' | 'completed';
  progress: number;
  detail: string;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // 진행 상황 (임시 데이터)
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { agent: 'Architect', step: '문서 구조 설계', status: 'completed', progress: 100, detail: '25개 섹션 구조 완료' },
    { agent: 'Writer', step: '본문 작성', status: 'running', progress: 65, detail: '16/25 섹션 작성 중...' },
    { agent: 'Image Curator', step: '이미지 선별', status: 'pending', progress: 0, detail: '대기 중' },
    { agent: 'Reviewer', step: '품질 검토', status: 'pending', progress: 0, detail: '대기 중' }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadProjectData(token);
    
    // 생성 중이면 5초마다 상태 확인
    const interval = setInterval(() => {
      if (project?.status === 'generating') {
        loadProjectData(token);
        // 임시: 진행률 업데이트 시뮬레이션
        simulateProgress();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, project?.status, router]);

  const loadProjectData = async (token: string) => {
    try {
      // 프로젝트 정보
      const projectResponse = await axios.get(
        `${API_URL}/api/projects/${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(projectResponse.data.project);

      // 생성 상태 확인
      const statusResponse = await axios.get(
        `${API_URL}/api/generate/${projectId}/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (statusResponse.data.document) {
        setDocument(statusResponse.data.document);
      }
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateProgress = () => {
    // 임시: 진행 상황 시뮬레이션
    setProgressSteps(prev => prev.map(step => {
      if (step.status === 'running' && step.progress < 100) {
        return { ...step, progress: Math.min(step.progress + 5, 100) };
      }
      return step;
    }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/generate/${projectId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // 파일 다운로드
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
      alert('다운로드에 실패했습니다');
    } finally {
      setDownloading(false);
    }
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

    // 임시: 시스템 응답 시뮬레이션
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
    
    // 임시: 파일 업로드 시뮬레이션
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const getUser = () => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">프로젝트를 찾을 수 없습니다</p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-lg font-bold">P</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Plan-Craft</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                홈
              </button>
              <button 
                onClick={() => router.push('/projects')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                내 프로젝트
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900">사용자 사례</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* 프로젝트 제목 */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => router.push('/projects')}
              className="text-blue-600 hover:text-blue-700 text-sm mb-2"
            >
              ← 프로젝트 목록
            </button>
            <h2 className="font-bold text-lg text-gray-900">{project.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl">{statusDisplay.icon}</span>
              <span className={`text-sm font-semibold text-${statusDisplay.color}-700`}>
                {statusDisplay.text}
              </span>
            </div>
          </div>

          {/* 진행 상황 */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">📊 진행 상황</h3>
            <div className="space-y-3">
              {progressSteps.map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">
                      {step.agent}
                    </span>
                    <span className={`font-semibold ${
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'running' ? 'text-blue-600' :
                      'text-gray-400'
                    }`}>
                      {step.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all ${
                        step.status === 'completed' ? 'bg-green-600' :
                        step.status === 'running' ? 'bg-blue-600' :
                        'bg-gray-300'
                      }`}
                      style={{ width: `${step.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 소통 영역 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-sm text-gray-900">💬 AI와 소통</h3>
              <p className="text-xs text-gray-500 mt-1">추가 요청이나 질문을 입력하세요</p>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-gray-400 mt-8">
                  아직 메시지가 없습니다
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p>{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 입력 영역 */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="추가 요청이나 질문 입력..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className={`flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition ${
                    uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span>📎</span>
                  <span>{uploadingFile ? '업로드 중...' : '추가 자료 업로드'}</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* 상태 헤더 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
                <p className="text-gray-600">{project.idea}</p>
              </div>
              {project.status === 'completed' && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {downloading ? '다운로드 중...' : '📥 HTML 다운로드'}
                </button>
              )}
            </div>
          </div>

          {/* 문서 통계 (완료 시) */}
          {document && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 문서 통계</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {document.qualityScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">품질 점수</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {document.sectionCount}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">섹션</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {document.wordCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">단어</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {document.imageCount}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">이미지</div>
                </div>
              </div>
            </div>
          )}

          {/* 상세 진행 로그 */}
          {project.status === 'generating' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 실시간 작업 로그</h3>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-start gap-3 text-green-600">
                  <span className="text-xs">✓</span>
                  <div>
                    <span className="font-semibold">[Architect]</span> 문서 구조 설계 완료: 25개 섹션
                  </div>
                </div>
                <div className="flex items-start gap-3 text-blue-600 animate-pulse">
                  <span className="text-xs">⏳</span>
                  <div>
                    <span className="font-semibold">[Writer]</span> 섹션 16/25 작성 중: "시장 분석 및 경쟁 현황"
                  </div>
                </div>
                <div className="flex items-start gap-3 text-gray-400">
                  <span className="text-xs">○</span>
                  <div>
                    <span className="font-semibold">[Image Curator]</span> 대기 중...
                  </div>
                </div>
                <div className="flex items-start gap-3 text-gray-400">
                  <span className="text-xs">○</span>
                  <div>
                    <span className="font-semibold">[Reviewer]</span> 대기 중...
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 완료 안내 */}
          {project.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                ✅ 문서 생성 완료!
              </h3>
              <p className="text-green-800">
                고품질 사업계획서가 성공적으로 생성되었습니다. 
                상단의 다운로드 버튼을 클릭하여 파일을 받으실 수 있습니다.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
