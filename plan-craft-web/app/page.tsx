'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Header from './components/Header';
import { useToast } from './components/Toast';
import api from './lib/api';
import TEMPLATES, { type RichTemplate } from './data/templates';

/* ══════════════════════════════════════════════════════ */
/*  Category config (Skywork-style circular icons)       */
/* ══════════════════════════════════════════════════════ */
const CATEGORIES = [
  { id: 'all', label: '전체', icon: '✨', gradient: 'from-gray-400 to-gray-500', lightBg: 'bg-gray-100 dark:bg-gray-700', ring: 'ring-gray-300 dark:ring-gray-600' },
  { id: 'business-plan', label: '사업계획서', icon: '📄', gradient: 'from-blue-400 to-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-900/30', ring: 'ring-blue-300 dark:ring-blue-600', category: '비즈니스' },
  { id: 'market', label: '시장분석', icon: '📊', gradient: 'from-emerald-400 to-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-900/30', ring: 'ring-emerald-300 dark:ring-emerald-600', category: '마케팅' },
  { id: 'invest', label: '투자유치', icon: '💰', gradient: 'from-amber-400 to-orange-500', lightBg: 'bg-amber-50 dark:bg-amber-900/30', ring: 'ring-amber-300 dark:ring-amber-600', category: '투자 유치' },
  { id: 'research', label: '연구보고서', icon: '🔬', gradient: 'from-violet-400 to-purple-600', lightBg: 'bg-violet-50 dark:bg-violet-900/30', ring: 'ring-violet-300 dark:ring-violet-600', category: '연구 보고', pro: true },
  { id: 'gov', label: '국가사업', icon: '🏢', gradient: 'from-rose-400 to-red-500', lightBg: 'bg-rose-50 dark:bg-rose-900/30', ring: 'ring-rose-300 dark:ring-rose-600', category: '국가 사업' },
  { id: 'mockup', label: '목업사이트', icon: '🎨', gradient: 'from-pink-400 to-fuchsia-500', lightBg: 'bg-pink-50 dark:bg-pink-900/30', ring: 'ring-pink-300 dark:ring-pink-600', pro: true },
  { id: 'marketing', label: '마케팅', icon: '📈', gradient: 'from-cyan-400 to-teal-500', lightBg: 'bg-cyan-50 dark:bg-cyan-900/30', ring: 'ring-cyan-300 dark:ring-cyan-600', category: '마케팅' },
  { id: 'tech', label: '기술문서', icon: '⚙️', gradient: 'from-slate-400 to-gray-500', lightBg: 'bg-slate-100 dark:bg-slate-800/50', ring: 'ring-slate-300 dark:ring-slate-600', category: '기술 문서' },
];

/* ── Sample popular projects for "인기 프로젝트" tab ── */
const POPULAR_PROJECTS = [
  { id: 'pop-1', title: 'AI 물류 최적화 플랫폼', desc: '딥러닝 기반 라스트마일 배송 최적화', gradient: 'from-blue-500 to-indigo-600', category: '사업계획서', templateId: '' },
  { id: 'pop-2', title: '스마트팜 자동화 시스템', desc: 'IoT 센서 기반 정밀 농업 모니터링', gradient: 'from-emerald-500 to-green-600', category: '국가 사업', templateId: 'gov-smart-farm' },
  { id: 'pop-3', title: 'SaaS 프로젝트 관리 도구', desc: 'Jira 대체 클라우드 네이티브 솔루션', gradient: 'from-violet-500 to-purple-600', category: '개발 기획', templateId: 'dev-saas-pm' },
  { id: 'pop-4', title: '전고체 배터리 연구', desc: '황화물계 고체전해질 소재 기술 분석', gradient: 'from-amber-500 to-orange-600', category: '연구 보고', templateId: 'res-solid-battery' },
  { id: 'pop-5', title: '글로벌 이커머스 진출', desc: '동남아 크로스보더 마케팅 전략', gradient: 'from-rose-500 to-pink-600', category: '투자 유치', templateId: 'biz-cross-border' },
  { id: 'pop-6', title: 'AI 의료 영상 진단', desc: 'CT/MRI 딥러닝 분석 솔루션', gradient: 'from-cyan-500 to-teal-600', category: '국가 사업', templateId: 'gov-ai-medical' },
  { id: 'pop-7', title: '디지털 트윈 스마트공장', desc: '실시간 시뮬레이션 예측 정비', gradient: 'from-sky-500 to-blue-600', category: '기술 문서', templateId: 'gov-digital-twin' },
  { id: 'pop-8', title: '생성형 AI 모델 연구', desc: 'LLM 한국어 특화 파인튜닝', gradient: 'from-fuchsia-500 to-purple-600', category: '연구 보고', templateId: 'res-generative-ai' },
  { id: 'pop-9', title: '프랜차이즈 카페 사업', desc: '프리미엄 커피 체인 수도권 확장', gradient: 'from-orange-500 to-red-500', category: '비즈니스', templateId: 'biz-coffee-franchise' },
  { id: 'pop-10', title: 'DevOps CI/CD 자동화', desc: 'GitOps 기반 배포 파이프라인', gradient: 'from-slate-500 to-gray-600', category: '개발 기획', templateId: 'dev-devops-cicd' },
];

/* ── Gradient configs for recent project cards ── */
const CARD_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-pink-600',
  'from-slate-500 to-gray-600',
];

/* ── How It Works steps ── */
const HOW_IT_WORKS = [
  { icon: '💡', title: '아이디어 입력', desc: '사업 아이디어와 참고자료를 제공합니다' },
  { icon: '🤖', title: '멀티에이전트 분석', desc: 'AI 에이전트들이 자율적으로 역할을 분배합니다' },
  { icon: '📝', title: '문서 자동 생성', desc: '전문가급 사업계획서가 실시간으로 작성됩니다' },
  { icon: '✅', title: '검토 및 완성', desc: 'AI 리뷰어가 품질을 검증하고 최종 문서를 완성합니다' },
];

interface RecentProject {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

/* ══════════════════════════════════════════════════════ */
/*  TemplateDetailModal                                  */
/* ══════════════════════════════════════════════════════ */
function TemplateDetailModal({
  template,
  onClose,
  onSelect,
}: {
  template: RichTemplate;
  onClose: () => void;
  onSelect: (t: RichTemplate) => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          {/* Category badge */}
          <span className="inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-3">
            {template.category}
          </span>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 pr-8">
            📄 {template.title}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{template.subtitle}</p>

          {/* Description / Overview */}
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {template.overview}
          </p>

          {/* Sections */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
              📋 섹션 구조
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {template.sections.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-gray-600 dark:text-gray-400"
                >
                  <span className="shrink-0 w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{s.replace(/^\d+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mb-6 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">⏱️ 예상 소요시간: <strong className="text-gray-700 dark:text-gray-300">8-10분</strong></span>
            <span className="flex items-center gap-1">📊 <strong className="text-gray-700 dark:text-gray-300">{template.sections.length}개</strong> 섹션</span>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {template.keywords.map((kw) => (
              <span key={kw} className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {kw}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onSelect(template)}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/20"
            >
              이 템플릿으로 프로젝트 생성
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
/*  Main Page Component                                  */
/* ══════════════════════════════════════════════════════ */
export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [proMode, setProMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template detail modal state
  const [modalTemplate, setModalTemplate] = useState<RichTemplate | null>(null);

  // Selected template tag (shown above prompt bar)
  const [selectedTemplate, setSelectedTemplate] = useState<RichTemplate | null>(null);

  // Accordion state for popular / recent sections (default collapsed)
  const [popularOpen, setPopularOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      loadRecentProjects();
    }
  }, []);

  const loadRecentProjects = async () => {
    setLoadingRecent(true);
    try {
      const response = await api.get('/api/projects');
      setRecentProjects((response.data.projects || []).slice(0, 10));
    } catch {}
    setLoadingRecent(false);
  };

  /* ── Create from prompt ── */
  const handleCreate = async () => {
    if (!searchText.trim() && !selectedTemplate) return;
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }
    try {
      const idea = selectedTemplate
        ? `[${selectedTemplate.category}] ${selectedTemplate.title}\n\n${searchText || selectedTemplate.desc}`
        : searchText;
      const title = selectedTemplate
        ? selectedTemplate.title
        : searchText.substring(0, 50);

      const response = await api.post('/api/projects', {
        title,
        idea,
        templateId: selectedTemplate?.id,
      });
      router.push(`/project/${response.data.project.id}`);
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || '알 수 없는 오류';
      showToast(`프로젝트 생성 실패: ${msg}`, 'error');
    }
  };

  /* ── Click popular project card → open modal ── */
  const handlePopularClick = (templateId: string, title: string, desc: string) => {
    // Try to find matching RichTemplate
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setModalTemplate(tpl);
    } else {
      // Fallback: create a minimal template-like object for display
      setModalTemplate({
        id: templateId || 'generic',
        title,
        subtitle: '',
        desc,
        category: '',
        sections: [],
        keywords: [],
        overview: desc,
      });
    }
  };

  /* ── Modal: "이 템플릿으로 프로젝트 생성" ── */
  const handleTemplateSelect = (tpl: RichTemplate) => {
    setSelectedTemplate(tpl);
    setModalTemplate(null); // close modal
    // Focus will naturally return to page with template tag visible above prompt
  };

  /* ── Remove selected template tag ── */
  const clearSelectedTemplate = () => {
    setSelectedTemplate(null);
  };

  /* ── Category filter for popular ── */
  const getFilteredPopular = () => {
    if (selectedCategory === 'all') return POPULAR_PROJECTS;
    const cat = CATEGORIES.find((c) => c.id === selectedCategory);
    if (!cat?.category) return POPULAR_PROJECTS;
    return POPULAR_PROJECTS.filter((p) => p.category === cat.category);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.pdf,.doc,.docx" />

      {/* Header */}
      <Header />

      {/* Template Detail Modal */}
      {modalTemplate && (
        <TemplateDetailModal
          template={modalTemplate}
          onClose={() => setModalTemplate(null)}
          onSelect={handleTemplateSelect}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16">

          {/* ═══════════════════════════════════════════ */}
          {/*  TITLE                                      */}
          {/* ═══════════════════════════════════════════ */}
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
              AI 멀티에이전트가 만드는
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                전문가급 사업계획서
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              아이디어를 입력하면 멀티에이전트가 협업하여 완성도 높은 문서를 자동 생성합니다
            </p>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  PROMPT BAR (Skywork-style)                 */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-10 sm:mb-12">
            <div className="relative bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-black/30 hover:shadow-xl hover:shadow-gray-300/50 dark:hover:shadow-black/40 transition-shadow duration-300">
              {/* Top row: Agent label + Pro toggle */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">에이전트</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">멀티에이전트</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Pro Mode toggle */}
                  <button
                    onClick={() => setProMode(!proMode)}
                    className="flex items-center gap-1.5 group"
                  >
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">Pro</span>
                    <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${proMode ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                      <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${proMode ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Selected template tag (shown above input when a template is chosen) */}
              {selectedTemplate && (
                <div className="px-4 pb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
                    [{selectedTemplate.category}] {selectedTemplate.title}
                    <button
                      onClick={clearSelectedTemplate}
                      className="ml-0.5 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              )}

              {/* Input row */}
              <div className="flex items-center px-4 pb-3 gap-2">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={selectedTemplate ? '추가 지시사항을 입력하세요...' : '사업 아이디어를 입력하세요...'}
                  className="flex-1 py-2.5 text-sm sm:text-base bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (searchText.trim() || selectedTemplate)) handleCreate();
                  }}
                />
                <div className="flex items-center gap-1.5">
                  {/* Attachment — 📎 always visible */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="파일 첨부"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  {/* Send */}
                  <button
                    onClick={handleCreate}
                    disabled={!searchText.trim() && !selectedTemplate}
                    className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 flex items-center justify-center transition-colors disabled:cursor-not-allowed shadow-md shadow-blue-500/30 disabled:shadow-none"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick suggestions */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">예시:</span>
              {['AI 물류 플랫폼 사업', '스마트팜 국가과제', 'SaaS 개발 기획', '시장분석 보고서'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSearchText(s)}
                  className="px-3 py-1 text-[11px] text-gray-500 dark:text-gray-400 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-full hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  CATEGORY ICONS (Skywork circular)          */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-10 sm:mb-12">
            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 scrollbar-hide justify-start sm:justify-center">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-2 min-w-[60px] group"
                >
                  <div
                    className={`
                      relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center
                      transition-all duration-200 ease-out
                      ${selectedCategory === cat.id
                        ? `bg-gradient-to-br ${cat.gradient} shadow-lg scale-105 ring-2 ${cat.ring} ring-offset-2 ring-offset-white dark:ring-offset-[#0B0F1A]`
                        : `${cat.lightBg} hover:scale-110 hover:shadow-md`
                      }
                    `}
                  >
                    <span className={`text-xl sm:text-2xl ${selectedCategory === cat.id ? 'drop-shadow-md' : ''}`}>
                      {cat.icon}
                    </span>
                    {cat.pro && (
                      <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-sm">
                        PRO
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                  }`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  HOW IT WORKS (작동방식) — ABOVE projects   */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5 text-center">
              작동방식
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {HOW_IT_WORKS.map((step, idx) => (
                <div
                  key={idx}
                  className="relative bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-4 text-center group hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200"
                >
                  {/* Step number */}
                  <span className="absolute top-3 left-3 text-[10px] font-bold text-gray-300 dark:text-gray-600">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="text-3xl mb-2">{step.icon}</div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {step.desc}
                  </p>
                  {/* Connector arrow (not on last) */}
                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-300 dark:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  인기 프로젝트 (Accordion — collapsed)      */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-4">
            <button
              onClick={() => setPopularOpen(!popularOpen)}
              className="w-full flex items-center justify-between py-3 px-1 group"
            >
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                🔥 인기 프로젝트
              </h2>
              <svg
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${popularOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapsible content */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                popularOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pt-2 pb-4 animate-fade-in">
                {getFilteredPopular().map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handlePopularClick(project.templateId, project.title, project.desc)}
                    className="group relative overflow-hidden rounded-2xl aspect-[4/3] text-left transition-all duration-200 hover:scale-[1.03] hover:shadow-xl"
                  >
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                    {/* Decorative pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-2 right-2 w-16 h-16 border border-white/30 rounded-full" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border border-white/20 rounded-full" />
                    </div>
                    {/* Content overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4">
                      <span className="text-[10px] sm:text-[11px] text-white/70 font-medium mb-1">{project.category}</span>
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-2">
                        {project.title}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  최근 프로젝트 (Accordion — collapsed)      */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-6">
            <button
              onClick={() => setRecentOpen(!recentOpen)}
              className="w-full flex items-center justify-between py-3 px-1 group"
            >
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                🕐 최근 프로젝트
              </h2>
              <div className="flex items-center gap-2">
                {isLoggedIn && recentOpen && (
                  <span
                    onClick={(e) => { e.stopPropagation(); router.push('/projects'); }}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium cursor-pointer"
                  >
                    전체 보기 →
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${recentOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Collapsible content */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                recentOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pt-2 pb-4 animate-fade-in">
                {!isLoggedIn ? (
                  <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-gray-700/50 border-dashed">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      프로젝트를 시작해보세요
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                      로그인하면 AI가 자동으로 전문가급 사업계획서를 생성해 드립니다
                    </p>
                    <button
                      onClick={() => router.push('/register')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      무료로 시작하기
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : loadingRecent ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="rounded-2xl aspect-[4/3] bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    ))}
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-gray-700/50 border-dashed">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      아직 프로젝트가 없습니다. 위의 프롬프트에 아이디어를 입력해보세요!
                    </p>
                    <button
                      onClick={() => router.push('/create')}
                      className="inline-flex items-center gap-2 px-5 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors font-medium"
                    >
                      새 프로젝트 만들기 →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {recentProjects.map((project, idx) => (
                      <button
                        key={project.id}
                        onClick={() => router.push(`/project/${project.id}`)}
                        className="group relative overflow-hidden rounded-2xl aspect-[4/3] text-left transition-all duration-200 hover:scale-[1.03] hover:shadow-xl"
                      >
                        {/* Gradient background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[idx % CARD_GRADIENTS.length]} opacity-85 group-hover:opacity-100 transition-opacity`} />
                        {/* Decorative */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-2 right-2 w-14 h-14 border border-white/30 rounded-full" />
                        </div>
                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              project.status === 'completed'
                                ? 'bg-white/20 text-white'
                                : project.status === 'generating'
                                ? 'bg-white/30 text-white'
                                : 'bg-white/15 text-white/80'
                            }`}>
                              {project.status === 'completed' ? '✅ 완료' : project.status === 'generating' ? '⏳ 생성 중' : '📝 초안'}
                            </span>
                            <span className="text-[9px] text-white/60">{formatDate(project.createdAt)}</span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-white leading-tight line-clamp-2">
                            {project.title}
                          </h3>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  BOTTOM CTA (non-logged-in)                 */}
          {/* ═══════════════════════════════════════════ */}
          {!isLoggedIn && (
            <section className="mt-16 text-center">
              <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 sm:p-12 max-w-xl mx-auto">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
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

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Plan-Craft · AI 멀티에이전트 문서 생성 플랫폼 · 87+/100 품질 · 8-10분 완성
          </p>
        </div>
      </footer>
    </div>
  );
}
