'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Plan-Craft v3.0
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          멀티 에이전트 AI로 고품질 사업계획서를 자동 생성
        </p>
        
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-4xl mb-2">🤖</div>
              <h3 className="font-semibold mb-2">4개 AI 에이전트</h3>
              <p className="text-sm text-gray-600">설계, 작성, 이미지, 검수</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="font-semibold mb-2">87+/100 품질</h3>
              <p className="text-sm text-gray-600">전문가 수준의 문서</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-semibold mb-2">20분 생성</h3>
              <p className="text-sm text-gray-600">빠른 문서 생성</p>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              로그인
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              회원가입
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-500">
          Claude Opus 4 기반 · 계층 구조 · 이미지 통합
        </p>
      </div>
    </div>
  );
}
