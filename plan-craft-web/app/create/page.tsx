'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function CreateProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    title: searchParams.get('title') || '',
    idea: searchParams.get('idea') || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // 프로젝트 생성
      const projectResponse = await axios.post(
        `${API_URL}/api/projects`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const projectId = projectResponse.data.project.id;

      // 문서 생성 시작
      await axios.post(
        `${API_URL}/api/generate/${projectId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 프로젝트 상세 페이지로 이동
      router.push(`/project/${projectId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '프로젝트 생성에 실패했습니다');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            프로젝트 생성
          </h1>
          <p className="text-gray-600 mb-8">
            프로젝트 정보를 입력하고 AI가 사업계획서를 생성합니다
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: AI 기반 스마트 물류 플랫폼"
                required
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                간결하고 명확한 제목을 입력하세요
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                핵심 아이디어 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.idea}
                onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="프로젝트의 핵심 아이디어와 목표를 자세히 설명해주세요.&#10;&#10;예:&#10;AI와 IoT를 활용하여 물류 배송을 최적화하고, 실시간 추적 및 예측 배송 시스템을 구축하는 혁신적인 플랫폼입니다. 블록체인 기반 투명한 이력 관리와 머신러닝 기반 수요 예측으로 물류 비용을 30% 절감합니다."
                required
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                최소 50자 이상 입력하시면 더 정확한 문서가 생성됩니다
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📌 생성 안내</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 문서 생성은 약 20-30분 소요됩니다</li>
                <li>• 4개의 AI 에이전트가 협업하여 고품질 문서를 생성합니다</li>
                <li>• 생성 비용은 약 $4-5 정도입니다</li>
                <li>• 생성 중에도 다른 작업이 가능합니다</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '생성 중...' : '문서 생성 시작'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateProjectForm />
    </Suspense>
  );
}
