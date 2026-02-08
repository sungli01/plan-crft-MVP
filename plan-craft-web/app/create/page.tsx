'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import { useToast } from '../components/Toast';
import api from '../lib/api';

interface TemplateInfo {
  id: string;
  title: string;
  subtitle: string;
  desc: string;
  category: string;
  sections: string[];
  keywords: string[];
  overview: string;
}

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [template, setTemplate] = useState<TemplateInfo | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsPro(user.plan === 'pro' || user.plan === 'enterprise');
      }
    } catch {
      // ignore
    }

    // Load template from search params
    const templateId = searchParams.get('template');
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [router, searchParams]);

  const loadTemplate = async (templateId: string) => {
    try {
      // Try loading from templates data
      const { default: templates } = await import('../data/templates');
      const found = (templates as TemplateInfo[]).find((t: TemplateInfo) => t.id === templateId);
      if (found) {
        setTemplate(found);
        setTitle(found.title);
        setIdea(found.overview);
      }
    } catch {
      // ignore
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

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    try {
      const formData = new FormData(e.currentTarget);
      const file = formData.get('document') as File;

      let referenceDoc = '';
      if (file && file.size > 0) {
        referenceDoc = await readFileAsText(file);
      }

      const response = await api.post('/api/projects', {
        title,
        idea,
        referenceDoc,
        deepResearch: deepResearch && isPro,
        templateId: template?.id,
      });

      const projectId = response.data.project.id;

      // 프로젝트 생성 후 즉시 문서 생성 시작
      try {
        await api.post(`/api/generate/${projectId}`);
      } catch (genErr) {
        console.error('문서 생성 시작 실패:', genErr);
      }

      router.push(`/project/${projectId}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      showToast('프로젝트 생성에 실패했습니다', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      setFileName(file.name);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-10 text-center sm:text-left">
          <button
            onClick={() => router.push('/projects')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            프로젝트 목록
          </button>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            새 프로젝트 만들기
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl">
            프로젝트 정보를 입력하면 AI 에이전트가 전문가 수준의 사업계획서를 생성합니다
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Main Form */}
          <div className="flex-1 min-w-0">
            <form onSubmit={handleCreateProject} className="space-y-8">
              {/* Title Input */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  프로젝트 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-5 py-4 text-lg font-medium bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl
                    focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                    text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                    transition-all duration-200"
                  placeholder="예: AI 기반 스마트 물류 플랫폼"
                  required
                />
              </div>

              {/* Idea Textarea */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  핵심 아이디어 <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="idea"
                  rows={8}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  className="w-full px-5 py-4 text-base bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl
                    focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
                    text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                    transition-all duration-200 resize-none leading-relaxed"
                  placeholder={`프로젝트의 핵심 아이디어를 자세히 설명해주세요.\n\n예시:\n• 해결하려는 문제와 시장 기회\n• 제공하는 솔루션과 핵심 기술\n• 타겟 고객과 비즈니스 모델\n• 차별화 포인트와 경쟁 우위`}
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>상세할수록 높은 품질의 문서가 생성됩니다</span>
                  <span>{idea.length}자</span>
                </div>
              </div>

              {/* File Upload — Drag & Drop */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  참고 문서 <span className="text-gray-400 dark:text-gray-500 font-normal">(선택)</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 p-8
                    ${isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
                      : fileName
                        ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="document"
                    accept=".txt,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center text-center">
                    {fileName ? (
                      <>
                        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-3">
                          <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">{fileName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">클릭하여 변경</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                          <svg className="w-7 h-7 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          파일을 드래그하거나 <span className="text-blue-600 dark:text-blue-400 underline">클릭하여 선택</span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                          TXT, PDF, DOC, DOCX — 참고할 문서나 기존 자료
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Deep Research Toggle */}
              <div className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                deepResearch && isPro
                  ? 'border-emerald-400 dark:border-emerald-600 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                        deepResearch && isPro
                          ? 'bg-emerald-100 dark:bg-emerald-900/50'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <span className="text-xl">🔬</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">심층 연구</span>
                          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold rounded-full tracking-wide">
                            PRO
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          학술 논문과 전문 자료를 분석하여 문서 품질 향상
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={deepResearch}
                      onClick={() => isPro && setDeepResearch(!deepResearch)}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                        deepResearch ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      } ${!isPro ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          deepResearch ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {!isPro && (
                    <div className="mt-3 ml-15 pl-[60px]">
                      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Pro 플랜 사용자만 이용 가능합니다
                      </p>
                    </div>
                  )}

                  {deepResearch && isPro && (
                    <div className="mt-4 ml-[60px]">
                      <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/30 rounded-lg px-3 py-2.5">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI가 학술 논문과 전문 자료를 분석하여 문서 품질을 대폭 향상시킵니다
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className={`flex-1 px-8 py-4 rounded-xl text-base font-bold text-white shadow-lg transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                    ${deepResearch && isPro
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 hover:shadow-emerald-500/25 hover:scale-[1.01]'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 hover:shadow-blue-500/25 hover:scale-[1.01]'
                    }`}
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      AI 에이전트 준비 중...
                    </span>
                  ) : deepResearch && isPro ? (
                    <span className="flex items-center justify-center gap-2">
                      🔬 심층 연구 + 프로젝트 생성
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      ✨ 프로젝트 생성하기
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/projects')}
                  disabled={creating}
                  className="px-6 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium
                    text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                    disabled:opacity-50 transition-all duration-200"
                >
                  취소
                </button>
              </div>
            </form>
          </div>

          {/* Right: Template Info + Tips */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-6">
            {/* Selected Template Card */}
            {template && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">선택된 템플릿</h3>
                    <button
                      onClick={() => {
                        setTemplate(null);
                        setTitle('');
                        setIdea('');
                      }}
                      className="text-white/70 hover:text-white text-xs transition"
                    >
                      해제
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold rounded-md mb-2">
                      {template.category}
                    </span>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">{template.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{template.subtitle}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{template.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {template.keywords.slice(0, 4).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] rounded-md">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <details className="text-xs">
                    <summary className="text-blue-600 dark:text-blue-400 cursor-pointer font-medium hover:underline">
                      {template.sections.length}개 섹션 보기
                    </summary>
                    <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400 max-h-48 overflow-y-auto">
                      {template.sections.map((s, i) => (
                        <li key={i} className="pl-2 border-l-2 border-gray-200 dark:border-gray-700">{s}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">⏱️</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">생성 소요 시간</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                    AI 에이전트가 고품질 사업계획서를 작성하는 데 약 <strong>15-25분</strong>이 소요됩니다.
                    생성이 시작되면 실시간으로 진행 상황을 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">🤖 AI 에이전트 작업 과정</h3>
              <div className="space-y-4">
                {[
                  { icon: '🏗️', color: 'blue', label: 'Architect', desc: '문서 구조 설계 및 목차 생성' },
                  { icon: '✍️', color: 'purple', label: 'Writer', desc: '각 섹션별 전문 내용 작성' },
                  { icon: '🎨', color: 'amber', label: 'Image', desc: '차트, 다이어그램, 이미지 생성' },
                  { icon: '🔍', color: 'green', label: 'Reviewer', desc: '품질 검수 및 최종 보고서 완성' },
                ].map((agent, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-${agent.color}-100 dark:bg-${agent.color}-900/30 flex items-center justify-center flex-shrink-0 text-sm`}>
                      {agent.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{agent.label}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{agent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
