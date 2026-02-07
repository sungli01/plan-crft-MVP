'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { projects } from '@/lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [model, setModel] = useState('claude-opus-4');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await projects.create(title, idea, model);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← 뒤로
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">새 프로젝트</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 제목 *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: AI 기반 스마트 물류 플랫폼"
              />
              <p className="mt-1 text-sm text-gray-500">최소 5자 이상</p>
            </div>

            <div>
              <label htmlFor="idea" className="block text-sm font-medium text-gray-700 mb-2">
                핵심 아이디어 *
              </label>
              <textarea
                id="idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                required
                minLength={20}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="프로젝트의 핵심 아이디어를 상세히 설명해주세요&#10;&#10;예: AI와 IoT를 활용하여 물류 배송을 최적화하고, 실시간 추적 및 예측 배송 시스템을 구축하는 혁신적인 플랫폼입니다. 블록체인 기반 투명한 이력 관리와 머신러닝 기반 수요 예측으로 물류 비용을 30% 절감합니다."
              />
              <p className="mt-1 text-sm text-gray-500">최소 20자 이상, 가능한 상세하게 작성하세요</p>
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                AI 모델 선택
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="claude-opus-4">Claude Opus 4 (최고 품질, 느림, 비쌈)</option>
                <option value="claude-sonnet-4">Claude Sonnet 4 (균형, 빠름, 저렴)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Opus 4: 품질 90-95점, 생성 시간 20-30분, 비용 $5-10
                <br />
                Sonnet 4: 품질 80-85점, 생성 시간 10-15분, 비용 $1-2
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="flex-1 text-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '생성 중...' : '프로젝트 생성'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
