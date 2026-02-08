'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DOCUMENT_TYPES = [
  { icon: '🏛️', label: '국가\n사업계획서', color: 'bg-blue-500' },
  { icon: '💻', label: '개발기획\n보고서', color: 'bg-purple-500' },
  { icon: '📑', label: '연구\n보고서', color: 'bg-green-500' },
  { icon: '🗺️', label: '비즈니스\n로드맵', color: 'bg-orange-500' },
  { icon: '📊', label: '사업\n제안서', color: 'bg-red-500' },
  { icon: '📈', label: '투자\n유치서', color: 'bg-indigo-500' },
  { icon: '📋', label: '기술\n백서', color: 'bg-teal-500' },
  { icon: '🎯', label: '마케팅\n전략서', color: 'bg-pink-500' }
];

const TEMPLATE_CATEGORIES = ['전체', '국가 사업', '개발 기획', '연구 보고', '비즈니스', '마케팅', '투자 유치', '기술 문서'];

const SAMPLE_TEMPLATES = [
  { title: 'AI 기반 물류 플랫폼', subtitle: '국가 사업계획서', desc: '정부지원사업 신청용 사업계획서' },
  { title: 'SaaS 개발 로드맵', subtitle: '개발 기획 보고서', desc: 'IT 프로젝트 기획 및 일정 관리' },
  { title: '친환경 에너지 솔루션', subtitle: '연구 보고서', desc: '신재생 에너지 연구개발 보고서' },
  { title: '글로벌 시장 진출', subtitle: '비즈니스 로드맵', desc: '해외시장 진출 전략 및 실행계획' },
  { title: '스마트시티 구축', subtitle: '정부 제안서', desc: '공공기관 제안용 사업계획서' },
  { title: '핀테크 서비스', subtitle: '투자 유치서', desc: '벤처캐피탈 투자유치용 IR자료' },
  { title: '블록체인 기술 백서', subtitle: '기술 백서', desc: '암호화폐/NFT 기술 문서' },
  { title: 'SNS 마케팅 전략', subtitle: '마케팅 전략서', desc: '디지털 마케팅 실행 계획' },
  { title: '빅데이터 분석 시스템', subtitle: '개발 기획서', desc: 'AI/ML 시스템 설계 문서' },
  { title: 'ESG 경영 전략', subtitle: '전략 보고서', desc: '지속가능경영 추진 계획' },
  { title: '메타버스 플랫폼', subtitle: '사업계획서', desc: '가상공간 플랫폼 구축 계획' },
  { title: '헬스케어 앱 개발', subtitle: '기획 보고서', desc: '모바일 헬스케어 서비스 기획' }
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
  idea: string;
  status: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // 랜딩 페이지 상태
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token) {
      setIsLoggedIn(true);
      if (userData) {
        setUser(JSON.parse(userData));
      }
      loadProjects(token);
    } else {
      setLoading(false);
    }
  }, []);

  const loadProjects = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setProjects([]);
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const idea = formData.get('idea') as string;
      const file = formData.get('document') as File;

      let referenceDoc = '';
      
      // 파일이 있으면 읽기
      if (file && file.size > 0) {
        referenceDoc = await readFileAsText(file);
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/projects`,
        { title, idea, referenceDoc },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 프로젝트 생성 후 상세 페이지로 이동
      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      generating: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      draft: '초안',
      generating: '생성 중',
      completed: '완료',
      failed: '실패'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.draft}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
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
    router.push('/register');
  };

  // 로딩 중
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

  // 로그인된 경우: 대시보드
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Plan-Craft v3.0</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">내 프로젝트</h2>
              <p className="text-gray-600 mt-1">사업계획서를 생성하고 관리하세요</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              + 새 프로젝트
            </button>
          </div>

          {/* 프로젝트 생성 폼 */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h3 className="text-xl font-semibold mb-4">새 프로젝트 만들기</h3>
              <form
                onSubmit={handleCreateProject}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    프로젝트 제목
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="예: AI 기반 스마트 물류 플랫폼"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    핵심 아이디어
                  </label>
                  <textarea
                    name="idea"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="프로젝트의 핵심 아이디어를 자세히 설명해주세요..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    참고 문서 (선택)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                    <input
                      type="file"
                      name="document"
                      accept=".txt,.pdf,.doc,.docx"
                      className="hidden"
                      id="document-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        const label = document.getElementById('document-label');
                        if (label && file) {
                          label.textContent = file.name;
                        }
                      }}
                    />
                    <label
                      htmlFor="document-upload"
                      className="cursor-pointer"
                    >
                      <div className="text-4xl mb-2">📎</div>
                      <p id="document-label" className="text-sm text-gray-600">
                        클릭하여 파일 선택 (TXT, PDF, DOC)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        참고할 문서나 자료가 있다면 업로드하세요
                      </p>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {creating ? '생성 중...' : '프로젝트 생성'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 프로젝트 목록 */}
          {projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                프로젝트가 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                첫 사업계획서를 생성해보세요!
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                프로젝트 만들기
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {project.title}
                    </h3>
                    {getStatusBadge(project.status)}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {project.idea}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // 로그인하지 않은 경우: 랜딩 페이지
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-lg font-bold">P</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Plan-Craft</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button className="text-sm text-gray-600 hover:text-gray-900">홈</button>
              <button className="text-sm text-gray-600 hover:text-gray-900">새 프로젝트 만들기</button>
              <button className="text-sm text-gray-600 hover:text-gray-900">프로젝트</button>
              <button className="text-sm text-gray-600 hover:text-gray-900">예약 작업</button>
              <button className="text-sm text-gray-600 hover:text-gray-900">사용자 사례</button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-600 hover:text-gray-900" title="검색">🔍</button>
            <button className="text-sm text-gray-600 hover:text-gray-900" title="다운로드">💾</button>
            <button className="text-sm text-gray-600 hover:text-gray-900" title="노트">📝</button>
            <button className="text-sm text-gray-600 hover:text-gray-900" title="알림">🔔</button>
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
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
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
            <button className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg text-sm hover:bg-pink-100">
              <span>✨</span>
              <span>에이전트</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <span>📄</span>
              <span>문서</span>
            </button>
            <div className="flex-1"></div>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
              Free Mode ▼
            </button>
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
                  router.push('/register');
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <button className="flex items-center gap-1 hover:text-gray-700">
              <span>📎</span>
              <span>파일 첨부</span>
            </button>
            <button className="flex items-center gap-1 hover:text-gray-700">
              <span>🖼️</span>
              <span>이미지 추가</span>
            </button>
            <button className="flex items-center gap-1 hover:text-gray-700">
              <span>📊</span>
              <span>데이터 삽입</span>
            </button>
            <span className="text-gray-400">|</span>
            <span>드래그앤드롭으로 파일을 추가하세요</span>
            <button 
              onClick={() => router.push('/register')}
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
              onClick={() => router.push('/register')}
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
            {SAMPLE_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => router.push('/register')}
                className="group bg-white rounded-xl border border-gray-200 hover:shadow-xl transition overflow-hidden"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 via-white to-purple-50 relative p-4 flex flex-col justify-between">
                  {/* 문서 미리보기 효과 */}
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
                  
                  {/* 품질 배지 */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">87+ 품질</span>
                    <span className="text-xs text-gray-500">20분</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/register')}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg"
          >
            Plan-Craft에 가입하여 무료로 시작하기 →
          </button>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 mt-16 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center text-sm text-gray-500">
            <p className="font-semibold text-gray-900 mb-2">Plan-Craft v3.0</p>
            <p>Claude Opus 4 기반 · 87+/100 품질 · 20분 생성 · 4개 AI 에이전트</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
