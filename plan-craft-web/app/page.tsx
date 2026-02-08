'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export default function Home() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      router.push('/dashboard');
    }
  }, [router]);

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
