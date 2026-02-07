'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DOCUMENT_CATEGORIES = [
  {
    id: 'government',
    icon: '🏛️',
    title: '국가 사업계획서',
    description: '정부지원사업 및 공공기관 제안서',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'development',
    icon: '💻',
    title: '개발기획보고서',
    description: 'IT 프로젝트 및 소프트웨어 기획서',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'research',
    icon: '📑',
    title: '연구보고서',
    description: '학술연구 및 R&D 보고서',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'roadmap',
    icon: '🗺️',
    title: '비즈니스 로드맵',
    description: '사업전략 및 실행계획서',
    color: 'from-orange-500 to-orange-600'
  }
];

const SAMPLE_TEMPLATES = [
  {
    title: 'AI 기반 물류 플랫폼',
    category: '국가 사업계획서',
    image: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Sample+1'
  },
  {
    title: '스마트 헬스케어 앱',
    category: '개발기획보고서',
    image: 'https://via.placeholder.com/400x300/8b5cf6/ffffff?text=Sample+2'
  },
  {
    title: '친환경 에너지 연구',
    category: '연구보고서',
    image: 'https://via.placeholder.com/400x300/10b981/ffffff?text=Sample+3'
  },
  {
    title: '글로벌 진출 전략',
    category: '비즈니스 로드맵',
    image: 'https://via.placeholder.com/400x300/f59e0b/ffffff?text=Sample+4'
  },
  {
    title: '스마트시티 구축계획',
    category: '국가 사업계획서',
    image: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Sample+5'
  },
  {
    title: 'SaaS 플랫폼 개발',
    category: '개발기획보고서',
    image: 'https://via.placeholder.com/400x300/8b5cf6/ffffff?text=Sample+6'
  }
];

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    setToken(stored);
    
    if (stored) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="text-2xl">📝</div>
            <h1 className="text-xl font-bold text-gray-900">Plan-Craft</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              로그인
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              무료 시작하기
            </button>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          고급 지능으로 <span className="text-blue-600">문서 생성</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          멀티 에이전트 AI가 전문가 수준의 사업계획서를 자동으로 작성합니다.<br/>
          국가사업, 개발기획, 연구보고서 등 다양한 문서를 20분 만에 완성하세요.
        </p>
        
        <div className="flex gap-4 justify-center mb-12">
          <button
            onClick={() => router.push('/register')}
            className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
          >
            지금 시작하기
          </button>
          <button
            onClick={() => {
              document.getElementById('samples')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 bg-white text-gray-700 text-lg rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-gray-200"
          >
            샘플 보기
          </button>
        </div>

        {/* 통계 */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">87+/100</div>
            <p className="text-gray-600">품질 점수</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">20분</div>
            <p className="text-gray-600">평균 생성 시간</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600 mb-2">4개</div>
            <p className="text-gray-600">AI 에이전트</p>
          </div>
        </div>
      </section>

      {/* 문서 카테고리 */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">원하는 문서를 선택하세요</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DOCUMENT_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => router.push('/register')}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-center border-2 border-gray-100 hover:border-transparent"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className="relative">
                  <div className="text-6xl mb-4">{category.icon}</div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{category.title}</h4>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 샘플 템플릿 */}
      <section id="samples" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">템플릿</h3>
            <p className="text-gray-600">다양한 샘플 문서를 확인하고 영감을 얻으세요</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SAMPLE_TEMPLATES.map((template, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden cursor-pointer group"
                onClick={() => router.push('/register')}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                  <div className="text-8xl opacity-20">📄</div>
                </div>
                <div className="p-6">
                  <div className="text-xs text-blue-600 font-semibold mb-2">{template.category}</div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                    {template.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    AI가 생성한 전문가 수준의 문서
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => router.push('/register')}
              className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              지금 문서 만들기 →
            </button>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-2xl font-bold mb-4">Plan-Craft v3.0</div>
          <p className="text-gray-400 mb-6">
            Claude Opus 4 기반 멀티 에이전트 문서 생성 시스템
          </p>
          <div className="text-sm text-gray-500">
            © 2026 Plan-Craft. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
