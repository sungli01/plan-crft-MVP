'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DOCUMENT_TYPES = [
  {
    id: 'government',
    icon: '🏛️',
    label: '국가사업',
    color: 'from-blue-400 to-blue-600',
    bg: 'bg-blue-50'
  },
  {
    id: 'development',
    icon: '💻',
    label: '개발기획',
    color: 'from-purple-400 to-purple-600',
    bg: 'bg-purple-50'
  },
  {
    id: 'research',
    icon: '📑',
    label: '연구보고',
    color: 'from-green-400 to-green-600',
    bg: 'bg-green-50'
  },
  {
    id: 'roadmap',
    icon: '🗺️',
    label: '로드맵',
    color: 'from-orange-400 to-orange-600',
    bg: 'bg-orange-50'
  },
  {
    id: 'proposal',
    icon: '📊',
    label: '제안서',
    color: 'from-pink-400 to-pink-600',
    bg: 'bg-pink-50'
  },
  {
    id: 'plan',
    icon: '📈',
    label: '기획서',
    color: 'from-indigo-400 to-indigo-600',
    bg: 'bg-indigo-50'
  },
  {
    id: 'report',
    icon: '📄',
    label: '보고서',
    color: 'from-teal-400 to-teal-600',
    bg: 'bg-teal-50'
  },
  {
    id: 'more',
    icon: '➕',
    label: '더보기',
    color: 'from-gray-400 to-gray-600',
    bg: 'bg-gray-50'
  }
];

const SAMPLE_DOCS = [
  { title: 'AI 기반 스마트 물류 플랫폼', category: '국가 사업계획서' },
  { title: 'SaaS 개발 기획 및 로드맵', category: '개발 기획 보고서' },
  { title: '친환경 에너지 솔루션 연구', category: '연구 보고서' },
  { title: '글로벌 시장 진출 전략', category: '비즈니스 로드맵' },
  { title: '스마트시티 구축 계획', category: '정부 제안서' },
  { title: '빅데이터 분석 시스템 설계', category: '기술 기획서' },
  { title: 'ESG 경영 전략 수립', category: '전략 보고서' },
  { title: '디지털 전환 로드맵', category: '사업 계획서' }
];

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('token');
    setToken(stored);
    
    if (stored) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              P
            </div>
            <span className="text-xl font-semibold text-gray-900">Plan-Craft</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition"
            >
              로그인
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
            >
              무료로 시작하기
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* 메인 타이틀 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            고급 지능으로 <span className="text-blue-600">문서 생성</span>
          </h1>
          <p className="text-lg text-gray-600">
            멀티 에이전트 AI로 전문가 수준의 사업계획서를 자동 생성합니다
          </p>
        </div>

        {/* 검색/입력 영역 */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <button className="px-4 py-2 bg-white rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                <span>📝</span>
                <span>템플릿 선택</span>
              </button>
              <button className="px-4 py-2 bg-white rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                <span>📎</span>
                <span>파일 첨부</span>
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="어떤 문서를 만들고 싶으신가요? 예: AI 기반 물류 플랫폼 사업계획서"
                className="w-full px-6 py-4 pr-32 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-base placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchText) {
                    router.push('/register');
                  }
                }}
              />
              <button
                onClick={() => router.push('/register')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>

        {/* 문서 타입 아이콘들 */}
        <div className="mb-16">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => router.push('/register')}
                className="group flex flex-col items-center gap-3"
              >
                <div className={`w-16 h-16 rounded-2xl ${type.bg} flex items-center justify-center text-3xl transition-transform group-hover:scale-110 shadow-sm group-hover:shadow-md`}>
                  {type.icon}
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 템플릿 섹션 */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">템플릿</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium">
                전체 보기
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {SAMPLE_DOCS.map((doc, index) => (
              <button
                key={index}
                onClick={() => router.push('/register')}
                className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition overflow-hidden"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 flex flex-col justify-between">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
                    <div className="text-6xl mb-2">📄</div>
                    <div className="text-xs text-blue-600 font-semibold mb-1">
                      {doc.category}
                    </div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">
                      {doc.title}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 bg-white/60 backdrop-blur-sm rounded px-2 py-1">
                    87+ 품질
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <button
            onClick={() => router.push('/register')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
          >
            지금 시작하기 →
          </button>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 mt-24 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          <div className="mb-2 font-semibold text-gray-900">Plan-Craft v3.0</div>
          <p>Claude Opus 4 · 87+/100 품질 · 20분 생성</p>
        </div>
      </footer>
    </div>
  );
}
