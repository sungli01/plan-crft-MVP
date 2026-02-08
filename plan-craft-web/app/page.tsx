'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Header from './components/Header';
import { useToast } from './components/Toast';
import api from './lib/api';
import TEMPLATES, { type RichTemplate } from './data/templates';
import RecentProjects from './components/RecentProjects';
import PopularTemplates from './components/PopularTemplates';
import TemplateCard from './components/TemplateCard';
import {
  ArchitectStepIcon,
  WriterStepIcon,
  ImageStepIcon,
  ReviewerStepIcon,
} from './components/Icons';

/* ── Category config ── */
const TEMPLATE_CATEGORIES = ['전체', '국가 사업', '개발 기획', '연구 보고', '비즈니스', '마케팅', '투자 유치', '기술 문서'];

/* ── Process Steps ── */
const PROCESS_STEPS = [
  {
    IconComponent: ArchitectStepIcon,
    step: '01',
    title: '구조 설계',
    desc: 'AI가 사업 아이디어를 분석하여 최적의 문서 구조를 자동 설계합니다.',
    tech: 'Claude Opus 4.6',
    color: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    IconComponent: WriterStepIcon,
    step: '02',
    title: '콘텐츠 작성',
    desc: '5개의 Writer 에이전트가 동시에 각 섹션을 병렬로 작성합니다.',
    tech: 'Claude Opus 4.6 × 5',
    color: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    IconComponent: ImageStepIcon,
    step: '03',
    title: '이미지 큐레이션',
    desc: '각 섹션의 맥락에 맞는 이미지를 자동으로 검색·배치합니다.',
    tech: 'Sonnet 4.5 + Unsplash',
    color: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    IconComponent: ReviewerStepIcon,
    step: '04',
    title: '품질 검수',
    desc: '독립 Reviewer가 전체 문서를 평가하고 87+점 품질을 보장합니다.',
    tech: 'Sonnet 4.5 · 자동 QA',
    color: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-50 dark:bg-green-900/20',
  },
];

export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsLoggedIn(true);
  }, []);

  /* ── Template click handler ── */
  const handleTemplateClick = async (template: RichTemplate) => {
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }
    try {
      const response = await api.post('/api/projects', {
        title: template.title,
        idea: template.overview || template.desc,
      });
      router.push(`/project/${response.data.project.id}`);
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || '알 수 없는 오류';
      showToast(`프로젝트 생성 실패: ${msg}`, 'error');
    }
  };

  /* ── Create from search ── */
  const handleSearchCreate = async () => {
    if (!searchText.trim()) return;
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }
    try {
      const response = await api.post('/api/projects', {
        title: searchText.substring(0, 50),
        idea: searchText,
      });
      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      showToast('프로젝트 생성에 실패했습니다', 'error');
    }
  };

  /* ── Filtered templates ── */
  const filteredTemplates = selectedCategory === '전체'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === selectedCategory);

  const displayedTemplates = showAllTemplates ? filteredTemplates : filteredTemplates.slice(0, 12);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F1A] flex flex-col">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.pdf,.doc,.docx" />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1">
        {/* ═══════════════════════════════════════════════ */}
        {/* HERO SECTION — Clean, Skywork-style            */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-transparent dark:from-blue-950/20 dark:via-transparent dark:to-transparent" />
          
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16">
            {/* Main heading */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">
                AI가 만드는
                <br />
                <span className="text-blue-600 dark:text-blue-400">전문가급 사업계획서</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl mx-auto">
                아이디어를 입력하면 4개의 AI 에이전트가 협업하여
                <br className="hidden sm:block" />
                완성도 높은 문서를 자동으로 생성합니다
              </p>
            </div>

            {/* Search / Create input — Clean, minimal */}
            <div className="max-w-2xl mx-auto">
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="pl-5 pr-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="어떤 문서를 만들고 싶으신가요?"
                    className="flex-1 py-4 pr-4 text-sm bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchText.trim()) handleSearchCreate();
                    }}
                  />
                  <div className="pr-3">
                    <button
                      onClick={handleSearchCreate}
                      disabled={!searchText.trim()}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
                    >
                      생성
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                <span className="text-xs text-gray-400 dark:text-gray-500">예시:</span>
                {['AI 물류 플랫폼', '스마트팜 자동화', 'SaaS 개발 기획'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setSearchText(suggestion)}
                    className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* CONTENT SECTIONS                               */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">

          {/* ── Recent Projects ── */}
          <RecentProjects />

          {/* ── Popular Templates ── */}
          <PopularTemplates />

          {/* ── How It Works — Minimal 4-step ── */}
          <section className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">작동 방식</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">4개의 전문 AI 에이전트가 순차적으로 협업합니다</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PROCESS_STEPS.map((step, idx) => {
                const StepIcon = step.IconComponent;
                return (
                  <div key={idx} className="relative text-center">
                    {/* Icon */}
                    <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${step.iconBg} flex items-center justify-center`}>
                      <StepIcon className="w-8 h-8" />
                    </div>

                    {/* Step number */}
                    <div className={`text-xs font-bold ${step.color} mb-1`}>{step.step}</div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>

                    {/* Desc */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>

                    {/* Tech badge */}
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                        {step.tech}
                      </span>
                    </div>

                    {/* Connector arrow (desktop, not last) */}
                    {idx < PROCESS_STEPS.length - 1 && (
                      <div className="hidden lg:block absolute top-7 -right-3 text-gray-300 dark:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── All Templates Section ── */}
          <section ref={templateSectionRef}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">전체 템플릿</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{TEMPLATES.length}개의 전문 문서 템플릿</p>
              </div>
            </div>

            {/* Category tabs — horizontal scroll */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowAllTemplates(false);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template grid — 4 cols desktop, 2 cols mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={handleTemplateClick}
                />
              ))}
            </div>

            {/* Show more / Show less */}
            {filteredTemplates.length > 12 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowAllTemplates(!showAllTemplates)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {showAllTemplates ? (
                    <>
                      접기
                      <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      더 보기 ({filteredTemplates.length - 12}개)
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </section>

          {/* ── Bottom CTA (non-logged-in) ── */}
          {!isLoggedIn && (
            <section className="mt-16 text-center">
              <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 sm:p-12 max-w-2xl mx-auto">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  지금 바로 시작하세요
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  무료로 가입하고 AI가 만드는 전문가급 문서를 경험해보세요
                </p>
                <button
                  onClick={() => router.push('/register')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                >
                  무료로 시작하기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ── Footer — Minimal ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Plan-Craft</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            AI 멀티에이전트 문서 생성 플랫폼 · 87+/100 품질 · 8-10분 완성
          </p>
        </div>
      </footer>
    </div>
  );
}
