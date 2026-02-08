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

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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

  const getStatusDisplay = (status: string) => {
    const displays = {
      draft: { text: '초안', color: 'gray', icon: '📝' },
      generating: { text: '생성 중...', color: 'yellow', icon: '⏳' },
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
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

      {/* 브레드크럼 */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push('/projects')}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← 프로젝트 목록으로 돌아가기
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* 상태 카드 */}
        <div className={`bg-${statusDisplay.color}-50 border border-${statusDisplay.color}-200 rounded-lg p-6 mb-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{statusDisplay.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {statusDisplay.text}
                </h2>
                <p className="text-gray-600 mt-1">
                  {project.status === 'generating' && '문서를 생성하고 있습니다. 잠시만 기다려주세요...'}
                  {project.status === 'completed' && '문서 생성이 완료되었습니다!'}
                  {project.status === 'failed' && '문서 생성에 실패했습니다. 다시 시도해주세요.'}
                  {project.status === 'draft' && '문서 생성을 시작하지 않았습니다.'}
                </p>
              </div>
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

        {/* 프로젝트 정보 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">프로젝트 정보</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">제목</span>
              <p className="text-gray-900">{project.title}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">핵심 아이디어</span>
              <p className="text-gray-900">{project.idea}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">생성 일시</span>
              <p className="text-gray-900">
                {new Date(project.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 문서 정보 (완료 시) */}
        {document && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">문서 통계</h3>
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

        {/* 생성 중 애니메이션 */}
        {project.status === 'generating' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-pulse mb-4">
              <div className="text-6xl">🤖</div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AI가 문서를 생성하고 있습니다
            </h3>
            <p className="text-gray-600 mb-6">
              4개의 AI 에이전트가 협업하여 고품질 사업계획서를 작성 중입니다.<br />
              약 20-30분 소요됩니다. 페이지를 닫으셔도 됩니다.
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Architect</span>
                <span>Writer</span>
                <span>Curator</span>
                <span>Reviewer</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
