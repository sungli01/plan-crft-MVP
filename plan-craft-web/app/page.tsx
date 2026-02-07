'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DOCUMENT_TYPES = [
  { icon: '📝', label: '방문', color: 'bg-blue-500' },
  { icon: '📊', label: '이미지', color: 'bg-yellow-500' },
  { icon: '📄', label: '문서', color: 'bg-purple-500' },
  { icon: '💼', label: '파워포인트', color: 'bg-red-500' },
  { icon: '📈', label: '채팅', color: 'bg-orange-500' },
  { icon: '🎨', label: '표', color: 'bg-green-500' },
  { icon: '🌐', label: '웹사이트', color: 'bg-blue-600' },
  { icon: '📹', label: '비디오', color: 'bg-pink-500' },
  { icon: '➕', label: '더보기', color: 'bg-gray-500' }
];

const TEMPLATE_CATEGORIES = ['전체', '구직 및 채용', '업무 관리 및 계획', '비지니스 및 마케팅', '사용량 활용도', '교육 및 훈련', '법률 및 콘트랙', '개인 관리'];

const SAMPLE_TEMPLATES = [
  { title: 'AI 기반 물류 플랫폼', subtitle: '국가 사업계획서', category: '비지니스 및 마케팅' },
  { title: 'SaaS 개발 로드맵', subtitle: '개발 기획 보고서', category: '업무 관리 및 계획' },
  { title: '친환경 에너지 연구', subtitle: '연구 보고서', category: '교육 및 훈련' },
  { title: '글로벌 진출 전략', subtitle: '비즈니스 로드맵', category: '비지니스 및 마케팅' },
  { title: '스마트시티 구축', subtitle: '정부 제안서', category: '업무 관리 및 계획' },
  { title: '빅데이터 분석 시스템', subtitle: '기술 기획서', category: '사용량 활용도' },
  { title: 'ESG 경영 전략', subtitle: '전략 보고서', category: '비지니스 및 마케팅' },
  { title: '디지털 전환', subtitle: '사업 계획서', category: '업무 관리 및 계획' }
];

export default function Home() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      router.push('/dashboard');
    }
  }, [router]);

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
            <button className="text-sm text-gray-600 hover:text-gray-900">🔍</button>
            <button className="text-sm text-gray-600 hover:text-gray-900">💬</button>
            <button className="text-sm text-gray-600 hover:text-gray-900">🔔</button>
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <span>📝</span>
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
              placeholder="좋은부"
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchText) {
                  router.push('/register');
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>📎</span>
            <span>콘텐츠 작성</span>
            <button className="ml-auto px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              →
            </button>
          </div>
        </div>

        {/* 아이콘 그리드 */}
        <div className="grid grid-cols-3 md:grid-cols-9 gap-4 mb-12">
          {DOCUMENT_TYPES.map((type, index) => (
            <button
              key={index}
              onClick={() => router.push('/register')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 ${type.color} rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform`}>
                {type.icon}
              </div>
              <span className="text-xs text-gray-700 text-center">{type.label}</span>
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
                className="group bg-white rounded-xl border border-gray-200 hover:shadow-lg transition overflow-hidden"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative p-4">
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="text-8xl">📄</div>
                  </div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-blue-600 font-semibold mb-1">
                      {template.subtitle}
                    </div>
                    <div className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
                      {template.title}
                    </div>
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
            Plan-Craft에 가입하여 무료로 무제한 창작을 시작하세요
          </button>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 mt-16 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center text-sm text-gray-500">
            <p className="font-semibold text-gray-900 mb-2">Plan-Craft v3.0</p>
            <p>Claude Opus 4 기반 멀티 에이전트 문서 생성 시스템</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
