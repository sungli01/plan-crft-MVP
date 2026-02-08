'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DOCUMENT_TYPES = [
  { icon: '🏛️', label: '국가\n사업계획서', color: 'bg-blue-500', category: '국가 사업' },
  { icon: '💻', label: '개발기획\n보고서', color: 'bg-purple-500', category: '개발 기획' },
  { icon: '📑', label: '연구\n보고서', color: 'bg-green-500', category: '연구 보고' },
  { icon: '🗺️', label: '비즈니스\n로드맵', color: 'bg-orange-500', category: '비즈니스' },
  { icon: '📊', label: '사업\n제안서', color: 'bg-red-500', category: '비즈니스' },
  { icon: '📈', label: '투자\n유치서', color: 'bg-indigo-500', category: '투자 유치' },
  { icon: '📋', label: '기술\n백서', color: 'bg-teal-500', category: '기술 문서' },
  { icon: '🎯', label: '마케팅\n전략서', color: 'bg-pink-500', category: '마케팅' }
];

const TEMPLATE_CATEGORIES = ['전체', '국가 사업', '개발 기획', '연구 보고', '비즈니스', '마케팅', '투자 유치', '기술 문서'];

const SAMPLE_TEMPLATES = [
  { title: 'AI 기반 물류 플랫폼', subtitle: '국가 사업계획서', desc: '정부지원사업 신청용 사업계획서', category: '국가 사업' },
  { title: 'SaaS 개발 로드맵', subtitle: '개발 기획 보고서', desc: 'IT 프로젝트 기획 및 일정 관리', category: '개발 기획' },
  { title: '친환경 에너지 솔루션', subtitle: '연구 보고서', desc: '신재생 에너지 연구개발 보고서', category: '연구 보고' },
  { title: '글로벌 시장 진출', subtitle: '비즈니스 로드맵', desc: '해외시장 진출 전략 및 실행계획', category: '비즈니스' },
  { title: '스마트시티 구축', subtitle: '정부 제안서', desc: '공공기관 제안용 사업계획서', category: '국가 사업' },
  { title: '핀테크 서비스', subtitle: '투자 유치서', desc: '벤처캐피탈 투자유치용 IR자료', category: '투자 유치' },
  { title: '블록체인 기술 백서', subtitle: '기술 백서', desc: '암호화폐/NFT 기술 문서', category: '기술 문서' },
  { title: 'SNS 마케팅 전략', subtitle: '마케팅 전략서', desc: '디지털 마케팅 실행 계획', category: '마케팅' },
  { title: '빅데이터 분석 시스템', subtitle: '개발 기획서', desc: 'AI/ML 시스템 설계 문서', category: '개발 기획' },
  { title: 'ESG 경영 전략', subtitle: '전략 보고서', desc: '지속가능경영 추진 계획', category: '비즈니스' },
  { title: '메타버스 플랫폼', subtitle: '사업계획서', desc: '가상공간 플랫폼 구축 계획', category: '비즈니스' },
  { title: '헬스케어 앱 개발', subtitle: '기획 보고서', desc: '모바일 헬스케어 서비스 기획', category: '개발 기획' }
];

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'agent' | 'document'>('agent');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 자동 로그인 체크
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
      loadProjects(token);
    }
  }, []);

  const loadProjects = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects((response.data.projects || []).slice(0, 10));
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setProjects([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && isLoggedIn) {
      handleFileSelect(files[0]);
    } else if (!isLoggedIn) {
      router.push('/register');
    }
  };

  const handleFileSelect = (file: File) => {
    console.log('파일 선택됨:', file.name);
    alert(`파일 "${file.name}"이(가) 선택되었습니다.\n프로젝트 생성 시 참고 문서로 사용됩니다.`);
    // TODO: 파일을 state에 저장하고 프로젝트 생성 시 함께 전송
  };

  const handleFileButtonClick = () => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다');
      router.push('/login');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCreateClick = async (template?: { title: string; subtitle: string; desc: string }) => {
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }

    if (template) {
      await createProjectFromTemplate(template);
    } else if (searchText) {
      await createProjectFromSearch(searchText);
    } else {
      router.push('/create');
    }
  };

  const createProjectFromTemplate = async (template: { title: string; subtitle: string; desc: string }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/projects`,
        { 
          title: template.title,
          idea: template.desc
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다');
    }
  };

  const createProjectFromSearch = async (text: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/projects`,
        { 
          title: text.substring(0, 50),
          idea: text
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다');
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      draft: '📝',
      generating: '⏳',
      completed: '✅',
      failed: '❌'
    };
    return icons[status as keyof typeof icons] || '📄';
  };

  const filteredTemplates = selectedCategory === '전체' 
    ? SAMPLE_TEMPLATES 
    : SAMPLE_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 파일 입력 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.pdf,.doc,.docx"
        onChange={handleFileInputChange}
      />

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <button onClick={() => router.push('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-lg font-bold">P</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Plan-Craft</span>
            </button>
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                홈
              </button>
              {isLoggedIn && (
                <button 
                  onClick={() => router.push('/projects')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  내 프로젝트
                </button>
              )}
              <button 
                onClick={() => alert('사용자 사례 페이지는 준비 중입니다')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                사용자 사례
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  로그인
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  무료 시작하기
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-700">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 (로그인 시) */}
        {isLoggedIn && (
          <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">최근 프로젝트</h3>
              {projects.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">
                  아직 프로젝트가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/project/${project.id}`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getStatusIcon(project.status)}</span>
                        <span className="text-sm font-medium text-gray-900 truncate flex-1">
                          {project.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push('/projects')}
                className="w-full mt-4 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                전체 프로젝트 보기 →
              </button>
            </div>
          </aside>
        )}

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto">
          <div className={`${isLoggedIn ? 'max-w-5xl' : 'max-w-6xl'} mx-auto px-6 py-8`}>
            {/* 타이틀 */}
            <h1 className="text-4xl font-bold text-center mb-8">
              고급 지능으로 <span className="text-blue-600">문서 생성</span>
            </h1>

            {/* 입력 영역 */}
            <div 
              className={`bg-white rounded-2xl border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} p-6 mb-8 shadow-sm transition`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={() => setMode('agent')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    mode === 'agent' 
                      ? 'bg-pink-50 border border-pink-200' 
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>✨</span>
                  <span>에이전트</span>
                </button>
                <button 
                  onClick={() => setMode('document')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    mode === 'document' 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>📄</span>
                  <span>문서</span>
                </button>
                <div className="flex-1"></div>
                <div className="relative">
                  <button 
                    onClick={() => setShowModeMenu(!showModeMenu)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    Free Mode ▼
                  </button>
                  {showModeMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button 
                        onClick={() => { setShowModeMenu(false); alert('Free Mode (무료 플랜)'); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Free Mode
                      </button>
                      <button 
                        onClick={() => { setShowModeMenu(false); alert('Pro Mode는 준비 중입니다'); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Pro Mode
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  ➕
                </div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="어떤 문서를 만들고 싶으신가요? 예: AI 기반 물류 플랫폼 사업계획서"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchText) {
                      handleCreateClick();
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <button 
                  onClick={handleFileButtonClick}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>📎</span>
                  <span>파일 첨부</span>
                </button>
                <button 
                  onClick={() => alert('이미지 추가 기능은 준비 중입니다')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>🖼️</span>
                  <span>이미지 추가</span>
                </button>
                <button 
                  onClick={() => alert('데이터 삽입 기능은 준비 중입니다')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>📊</span>
                  <span>데이터 삽입</span>
                </button>
                <span className="text-gray-400">|</span>
                <span>드래그앤드롭으로 파일을 추가하세요</span>
                <button 
                  onClick={() => handleCreateClick()}
                  className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  생성 →
                </button>
              </div>
            </div>

            {/* 문서 타입 아이콘들 */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-6 mb-12">
              {DOCUMENT_TYPES.map((type, index) => (
                <button
                  key={index}
                  onClick={() => handleCreateClick({
                    title: type.label.replace(/\n/g, ' '),
                    subtitle: type.label.replace(/\n/g, ' '),
                    desc: `${type.label.replace(/\n/g, ' ')}를 생성합니다. 프로젝트의 핵심 아이디어와 목표를 입력해주세요.`
                  })}
                  className="group flex flex-col items-center gap-2"
                >
                  <div className={`w-16 h-16 ${type.color} rounded-2xl flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform`}>
                    {type.icon}
                  </div>
                  <span className="text-xs text-gray-700 text-center whitespace-pre-line leading-tight">
                    {type.label}
                  </span>
                </button>
              ))}
            </div>

            {/* 템플릿 섹션 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">템플릿</h2>
              </div>

              {/* 카테고리 탭 */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 템플릿 그리드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleCreateClick(template)}
                    className="group bg-white rounded-xl border border-gray-200 hover:shadow-xl transition overflow-hidden"
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 via-white to-purple-50 relative p-4 flex flex-col justify-between">
                      <div className="bg-white rounded-lg shadow-sm p-3 flex-1 flex flex-col">
                        <div className="text-xs text-blue-600 font-semibold mb-2">
                          {template.subtitle}
                        </div>
                        <div className="text-sm font-bold text-gray-900 leading-tight mb-2">
                          {template.title}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2 mb-3">
                          {template.desc}
                        </div>
                        <div className="mt-auto space-y-1">
                          <div className="h-1 bg-gray-200 rounded"></div>
                          <div className="h-1 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-1 bg-gray-200 rounded w-3/5"></div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">87+ 품질</span>
                        <span className="text-xs text-gray-500">8-10분</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            {!isLoggedIn && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => router.push('/register')}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg"
                >
                  Plan-Craft에 가입하여 무료로 시작하기 →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center text-sm text-gray-500">
            <p className="font-semibold text-gray-900 mb-2">Plan-Craft v3.0</p>
            <p>Claude Opus 4.6 Agent Teams · 87+/100 품질 · 8-10분 생성 · 병렬 처리</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
