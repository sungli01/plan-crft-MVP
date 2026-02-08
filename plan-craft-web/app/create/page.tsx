'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../components/Toast';
import ProLock from '../components/ProLock';
import api from '../lib/api';

export default function CreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Check user plan
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsPro(user.plan === 'pro' || user.plan === 'enterprise');
      }
    } catch {
      // ignore
    }
  }, [router]);

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

      const response = await api.post('/api/projects', { title, idea, referenceDoc, deepResearch: deepResearch && isPro });

      // 프로젝트 생성 후 상세 페이지로 이동
      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      showToast('프로젝트 생성에 실패했습니다', 'error');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <Header />

      {/* 메인 컨텐츠 */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">새 프로젝트 만들기</h2>
          <p className="text-gray-600 mt-1">프로젝트 정보를 입력하여 사업계획서를 생성하세요</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleCreateProject} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 제목 *
              </label>
              <input
                type="text"
                name="title"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: AI 기반 스마트 물류 플랫폼"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                핵심 아이디어 *
              </label>
              <textarea
                name="idea"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="프로젝트의 핵심 아이디어를 자세히 설명해주세요...

예시:
- 해결하려는 문제
- 제공하는 솔루션
- 타겟 고객
- 주요 기능
- 예상 비즈니스 모델"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                참고 문서 (선택)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
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
                      label.textContent = `📎 ${file.name}`;
                      label.classList.add('text-blue-600', 'font-semibold');
                    }
                  }}
                />
                <label htmlFor="document-upload" className="cursor-pointer block">
                  <div className="text-5xl mb-3">📎</div>
                  <p id="document-label" className="text-sm text-gray-600 mb-2">
                    클릭하여 파일 선택
                  </p>
                  <p className="text-xs text-gray-500">
                    지원 형식: TXT, PDF, DOC, DOCX
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    참고할 문서나 자료가 있다면 업로드하세요
                  </p>
                </label>
              </div>
            </div>

            {/* 심층 연구 토글 */}
            <div>
              <ProLock feature="심층 연구" isPro={isPro}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔬</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            심층 연구
                          </span>
                          <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold rounded-full">
                            Pro
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          학술 논문과 전문 자료 기반 분석
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={deepResearch}
                      onClick={() => isPro && setDeepResearch(!deepResearch)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                        deepResearch ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      } ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          deepResearch ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {deepResearch && isPro && (
                    <div className="mt-3 pl-11">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-md px-3 py-2">
                        ✨ AI가 학술 논문과 전문 자료를 분석하여 문서 품질을 향상시킵니다
                      </p>
                    </div>
                  )}
                </div>
              </ProLock>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    생성 중...
                  </span>
                ) : (
                  deepResearch && isPro ? '🔬 심층 연구 + 프로젝트 생성' : '프로젝트 생성'
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/projects')}
                disabled={creating}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
              >
                취소
              </button>
            </div>
          </form>
        </div>

        {/* 안내 사항 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 생성 소요 시간</h3>
          <p className="text-sm text-blue-800">
            AI 에이전트가 고품질 사업계획서를 작성하는 데 약 <strong>15-25분</strong>이 소요됩니다.
            생성이 시작되면 프로젝트 상세 페이지에서 실시간으로 진행 상황을 확인하실 수 있습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
