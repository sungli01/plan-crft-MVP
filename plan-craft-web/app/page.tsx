'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import Header from './components/Header';
import { useToast } from './components/Toast';
import api from './lib/api';
import type { Project } from './types';
import TEMPLATES, { type RichTemplate } from './data/templates';
import {
  GovernmentIcon,
  DevIcon,
  ResearchIcon,
  BusinessIcon,
  ProposalIcon,
  InvestIcon,
  TechIcon,
  MarketingIcon,
  ArchitectStepIcon,
  WriterStepIcon,
  ImageStepIcon,
  ReviewerStepIcon,
} from './components/Icons';

/* ── Document Types with SVG Icon Components ── */
const DOCUMENT_TYPES: { icon: (props: { className?: string }) => ReactNode; label: string; color: string; category: string }[] = [
  { icon: GovernmentIcon, label: '국가\n사업계획서', color: 'bg-blue-500', category: '국가 사업' },
  { icon: DevIcon, label: '개발기획\n보고서', color: 'bg-purple-500', category: '개발 기획' },
  { icon: ResearchIcon, label: '연구\n보고서', color: 'bg-green-500', category: '연구 보고' },
  { icon: BusinessIcon, label: '비즈니스\n로드맵', color: 'bg-orange-500', category: '비즈니스' },
  { icon: ProposalIcon, label: '사업\n제안서', color: 'bg-red-500', category: '비즈니스' },
  { icon: InvestIcon, label: '투자\n유치서', color: 'bg-indigo-500', category: '투자 유치' },
  { icon: TechIcon, label: '기술\n백서', color: 'bg-teal-500', category: '기술 문서' },
  { icon: MarketingIcon, label: '마케팅\n전략서', color: 'bg-pink-500', category: '마케팅' },
];

const TEMPLATE_CATEGORIES = ['전체', '국가 사업', '개발 기획', '연구 보고', '비즈니스', '마케팅', '투자 유치', '기술 문서'];

/* ── Rich Templates from data file (70+ with sections, keywords, overview) ── */
const SAMPLE_TEMPLATES = TEMPLATES;

/* ── Category Gradient Colors for Premium Template Cards ── */
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; badge: string; badgeText: string; icon: string }> = {
  '국가 사업': { from: 'from-blue-400', to: 'to-blue-600', badge: 'bg-blue-100 dark:bg-blue-900/50', badgeText: 'text-blue-700 dark:text-blue-300', icon: '🏛️' },
  '개발 기획': { from: 'from-purple-400', to: 'to-purple-600', badge: 'bg-purple-100 dark:bg-purple-900/50', badgeText: 'text-purple-700 dark:text-purple-300', icon: '💻' },
  '연구 보고': { from: 'from-green-400', to: 'to-green-600', badge: 'bg-green-100 dark:bg-green-900/50', badgeText: 'text-green-700 dark:text-green-300', icon: '🔬' },
  '비즈니스': { from: 'from-orange-400', to: 'to-orange-600', badge: 'bg-orange-100 dark:bg-orange-900/50', badgeText: 'text-orange-700 dark:text-orange-300', icon: '📈' },
  '마케팅': { from: 'from-pink-400', to: 'to-pink-600', badge: 'bg-pink-100 dark:bg-pink-900/50', badgeText: 'text-pink-700 dark:text-pink-300', icon: '📣' },
  '투자 유치': { from: 'from-indigo-400', to: 'to-indigo-600', badge: 'bg-indigo-100 dark:bg-indigo-900/50', badgeText: 'text-indigo-700 dark:text-indigo-300', icon: '💰' },
  '기술 문서': { from: 'from-teal-400', to: 'to-teal-600', badge: 'bg-teal-100 dark:bg-teal-900/50', badgeText: 'text-teal-700 dark:text-teal-300', icon: '⚙️' },
};

const DEFAULT_GRADIENT = { from: 'from-gray-400', to: 'to-gray-600', badge: 'bg-gray-100 dark:bg-gray-800', badgeText: 'text-gray-700 dark:text-gray-300', icon: '📄' };

// Dead code removed — templates imported from data/templates.ts
// _OLD_TEMPLATES_REMOVED was here

/* ── Process Steps with technical details ── */
const PROCESS_STEPS = [
  {
    IconComponent: ArchitectStepIcon,
    agent: 'Architect Agent',
    title: '구조 설계',
    desc: 'Claude Opus 4.6이 사업 아이디어를 분석하여 25+개 섹션의 최적 문서 구조를 자동 설계합니다.',
    details: [
      '산업 분석 → 목차 자동 생성',
      '섹션별 요구사항 정의',
      '글자 수·깊이 자동 산정',
    ],
    techNote: 'Claude Opus 4.6 · 1M Context',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    IconComponent: WriterStepIcon,
    agent: 'Writer Agent (×5)',
    title: '콘텐츠 작성',
    desc: '5개의 Writer 에이전트가 동시에 각 섹션을 병렬 작성하여 속도를 극대화합니다.',
    details: [
      '5개 에이전트 동시 병렬 처리',
      '섹션당 500~1,000자 전문 콘텐츠',
      '개조식 + 계층 구조 자동 적용',
    ],
    techNote: 'Claude Opus 4.6 · 병렬 5x',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    IconComponent: ImageStepIcon,
    agent: 'Image Curator Agent',
    title: '이미지 큐레이션',
    desc: 'AI가 각 섹션의 맥락을 분석하여 적합한 이미지를 자동 검색·생성·배치합니다.',
    details: [
      'Unsplash API 고품질 이미지 검색',
      'AI 생성 다이어그램·차트',
      '자동 캡션 및 위치 최적화',
    ],
    techNote: 'Claude Sonnet 4.5 + Unsplash',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    IconComponent: ReviewerStepIcon,
    agent: 'Reviewer Agent',
    title: '품질 검수',
    desc: '독립된 Reviewer가 전체 문서를 섹션별로 평가하고 87+/100점 품질을 보장합니다.',
    details: [
      '논리성·일관성·완결성 다면 평가',
      '섹션별 점수 + 종합 품질 리포트',
      '기준 미달 섹션 자동 재작성',
    ],
    techNote: 'Claude Sonnet 4.5 · 자동 QA',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

const STATS = [
  { value: '87+/100', label: '품질 점수', icon: '⭐' },
  { value: '8-10분', label: '생성 시간', icon: '⏱️' },
  { value: '4', label: 'AI 에이전트', icon: '🤖' },
  { value: '25+', label: '섹션 구성', icon: '📄' },
];

interface HomeProject {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'agent' | 'document'>('agent');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<'agent' | 'document'>('agent');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 자동 로그인 체크
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setIsLoggedIn(true);
      loadProjects();
    }
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjects((response.data.projects || []).slice(0, 10));
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && isLoggedIn) {
      handleFileSelect(files[0]);
    } else if (!isLoggedIn) {
      router.push('/register');
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleFileButtonClick = () => {
    if (!isLoggedIn) {
      showToast('로그인이 필요합니다', 'info');
      router.push('/login');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCreateClick = async (template?: { title: string; subtitle: string; desc: string }) => {
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }

    if (template) {
      await createProjectFromTemplate(template);
    } else if (searchText) {
      await createProjectFromSearch(searchText);
    } else {
      router.push('/create');
    }
  };

  const createProjectFromTemplate = async (template: any) => {
    try {
      // Use rich overview if available, fall back to desc
      const idea = template.overview || template.desc;
      console.log('Creating project:', { title: template.title, ideaLength: idea?.length });
      const response = await api.post('/api/projects', { 
        title: template.title,
        idea: idea
      });

      router.push(`/project/${response.data.project.id}`);
    } catch (error: any) {
      console.error('프로젝트 생성 실패:', error?.response?.data || error);
      const msg = error?.response?.data?.error || error?.message || '알 수 없는 오류';
      showToast(`프로젝트 생성 실패: ${msg}`, 'error');
    }
  };

  const createProjectFromSearch = async (text: string) => {
    try {
      const response = await api.post('/api/projects', { 
        title: text.substring(0, 50),
        idea: text
      });

      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      showToast('프로젝트 생성에 실패했습니다', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      draft: '📝',
      generating: '⏳',
      completed: '✅',
      failed: '❌'
    };
    return icons[status as keyof typeof icons] || '📄';
  };

  const filteredTemplates = selectedCategory === '전체' 
    ? SAMPLE_TEMPLATES 
    : SAMPLE_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 파일 입력 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.pdf,.doc,.docx"
        onChange={handleFileInputChange}
      />

      {/* 헤더 */}
      <Header />

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 (로그인 시, 데스크톱만) */}
        {isLoggedIn && (
          <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">최근 프로젝트</h3>
              {projects.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">
                  아직 프로젝트가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/project/${project.id}`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getStatusIcon(project.status)}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                          {project.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push('/projects')}
                className="w-full mt-4 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                전체 프로젝트 보기 →
              </button>
            </div>
          </aside>
        )}

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto">
          <div className={`${isLoggedIn ? 'max-w-5xl' : 'max-w-6xl'} mx-auto px-4 sm:px-6 py-8`}>

            {/* ===== HERO SECTION ===== */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 font-medium mb-4">
                <span>🤖</span>
                <span>멀티에이전트 오토리밸런싱 오케스트라를 통한 문서 생성</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                전문가급 사업계획서를<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  AI가 자동으로 생성
                </span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                4개의 전문 AI 에이전트가 자율적으로 역할을 분배하고,<br className="hidden sm:block" />
                실시간 품질 피드백 루프를 통해 최적의 결과물을 생성합니다.<br className="hidden sm:block" />
                <span className="font-medium text-gray-700 dark:text-gray-300">아이디어만 입력하면 8-10분 내에 전문가 수준 문서가 완성됩니다.</span>
              </p>
            </div>

            {/* ===== STATS BAR ===== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 max-w-2xl mx-auto">
              {STATS.map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-center shadow-sm">
                  <div className="text-lg mb-0.5">{stat.icon}</div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* 입력 영역 */}
            <div 
              className={`bg-white dark:bg-gray-800 rounded-2xl border-2 ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'} p-4 sm:p-6 mb-8 shadow-sm transition`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
                <button 
                  onClick={() => setMode('agent')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    mode === 'agent' 
                      ? 'bg-pink-50 border border-pink-200' 
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>✨</span>
                  <span>에이전트</span>
                </button>
                <button 
                  onClick={() => setMode('document')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    mode === 'document' 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>📄</span>
                  <span>문서</span>
                </button>
                <div className="flex-1"></div>
                <div className="relative">
                  <button 
                    onClick={() => setShowModeMenu(!showModeMenu)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    Free Mode ▼
                  </button>
                  {showModeMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button 
                        onClick={() => { setShowModeMenu(false); showToast('Free Mode (무료 플랜)', 'info'); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Free Mode
                      </button>
                      <button 
                        onClick={() => { setShowModeMenu(false); showToast('Pro Mode는 준비 중입니다', 'info'); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Pro Mode
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  ➕
                </div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="어떤 문서를 만들고 싶으신가요? 예: AI 기반 물류 플랫폼 사업계획서"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchText) {
                      handleCreateClick();
                    }
                  }}
                />
              </div>

              {uploadedFile && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span>📎</span>
                    <span className="text-blue-700 font-medium">{uploadedFile.name}</span>
                    <span className="text-gray-500">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <button 
                  onClick={handleFileButtonClick}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>📎</span>
                  <span>파일 첨부</span>
                </button>
                <button 
                  onClick={() => showToast('이미지 추가 기능은 준비 중입니다', 'info')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>🖼️</span>
                  <span>이미지 추가</span>
                </button>
                <button 
                  onClick={() => showToast('데이터 삽입 기능은 준비 중입니다', 'info')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>📊</span>
                  <span>데이터 삽입</span>
                </button>
                <span className="text-gray-400 hidden sm:inline">|</span>
                <span className="hidden sm:inline">드래그앤드롭으로 파일을 추가하세요</span>
                <button 
                  onClick={() => handleCreateClick()}
                  className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  생성 →
                </button>
              </div>
            </div>

            {/* 문서 타입 아이콘들 — SVG Icons */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4 sm:gap-6 mb-12">
              {DOCUMENT_TYPES.map((type, index) => {
                const IconComp = type.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleCreateClick({
                      title: type.label.replace(/\n/g, ' '),
                      subtitle: type.label.replace(/\n/g, ' '),
                      desc: `${type.label.replace(/\n/g, ' ')}를 생성합니다. 프로젝트의 핵심 아이디어와 목표를 입력해주세요.`
                    })}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className="group-hover:scale-110 transition-transform">
                      <IconComp className="w-12 h-12 sm:w-16 sm:h-16" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-700 text-center whitespace-pre-line leading-tight">
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ===== HOW IT WORKS ===== */}
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">어떻게 작동하나요?</h2>
                <p className="text-gray-600 dark:text-gray-400">4개의 전문 AI 에이전트가 순차적으로 협업합니다</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PROCESS_STEPS.map((step, idx) => {
                  const StepIcon = step.IconComponent;
                  return (
                    <div key={idx} className="relative">
                      <div className={`${step.bgColor} border ${step.borderColor} rounded-xl p-5 h-full flex flex-col`}>
                        {/* Header: Icon + Agent info */}
                        <div className="flex items-center gap-3 mb-3">
                          <StepIcon className="w-10 h-10 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 font-medium">Step {idx + 1}</div>
                            <div className="text-sm font-bold text-gray-900 truncate">{step.agent}</div>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{step.desc}</p>

                        {/* Detail bullets */}
                        <ul className="space-y-1.5 mb-3 flex-1">
                          {step.details.map((detail, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-1.5 text-xs text-gray-700">
                              <span className="mt-0.5 text-gray-400">▸</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Tech badge */}
                        <div className="pt-2 border-t border-gray-200/60">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 rounded text-[10px] font-medium text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                            {step.techNote}
                          </span>
                        </div>
                      </div>
                      {/* Arrow connector (desktop only, not last) */}
                      {idx < PROCESS_STEPS.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-300 text-xl z-10">
                          →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===== AGENT & DOCUMENT REFERENCE TABS ===== */}
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">AI 시스템 아키텍처</h2>
                <p className="text-gray-600 dark:text-gray-400">멀티에이전트 오케스트레이션과 문서 레퍼런스를 확인하세요</p>
              </div>

              {/* Tab buttons */}
              <div className="flex justify-center gap-2 mb-8">
                <button
                  onClick={() => setActiveInfoTab('agent')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeInfoTab === 'agent'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  🤖 에이전트
                </button>
                <button
                  onClick={() => setActiveInfoTab('document')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeInfoTab === 'document'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  📋 문서 레퍼런스
                </button>
              </div>

              {/* Tab Content */}
              {activeInfoTab === 'agent' ? (
                /* ── Agent Architecture Diagram ── */
                <div className="max-w-3xl mx-auto">
                  {/* Orchestrator */}
                  <div className="relative">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 animate-pulse-subtle">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="w-3 h-3 rounded-full bg-green-400 animate-ping-slow inline-block shadow-lg shadow-green-400/50"></span>
                        <span className="text-lg font-bold">🎯 Orchestrator</span>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">메인</span>
                      </div>
                      <p className="text-center text-sm text-blue-100">오토리밸런싱 &amp; 태스크 분배</p>
                      <div className="text-center mt-2">
                        <span className="text-xs bg-white/15 px-3 py-1 rounded-full">Claude Opus 4.6 · 1M Context</span>
                      </div>
                    </div>
                  </div>

                  {/* Connector: Orchestrator → Sub-agents */}
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-blue-500 to-blue-300 dark:to-blue-700"></div>
                  </div>
                  <div className="flex justify-center mb-1">
                    <div className="relative w-1/2 h-px">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-600 to-transparent"></div>
                    </div>
                  </div>
                  <div className="flex justify-between max-w-2xl mx-auto px-8 mb-1">
                    <div className="w-px h-6 bg-blue-300 dark:bg-blue-600"></div>
                    <div className="w-px h-6 bg-blue-300 dark:bg-blue-600"></div>
                    <div className="w-px h-6 bg-blue-300 dark:bg-blue-600"></div>
                  </div>

                  {/* Sub-agents */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-1">
                    {/* Architect */}
                    <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">🏗️ Architect</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">구조 설계</p>
                      <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">Claude Opus 4.6</span>
                    </div>
                    {/* Writer */}
                    <div className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">✍️ Writer ×5</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">콘텐츠 작성</p>
                      <span className="text-[10px] bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full">Claude Opus 4.6 · 병렬</span>
                    </div>
                    {/* Image Curator */}
                    <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-center shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">🖼️ Image Curator</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">이미지 큐레이션</p>
                      <span className="text-[10px] bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 px-2 py-0.5 rounded-full">Sonnet 4.5 + Unsplash</span>
                    </div>
                  </div>

                  {/* Connector: Sub-agents → Reviewer */}
                  <div className="flex justify-between max-w-2xl mx-auto px-8 mb-1">
                    <div className="w-px h-6 bg-green-300 dark:bg-green-700"></div>
                    <div className="w-px h-6 bg-green-300 dark:bg-green-700"></div>
                    <div className="w-px h-6 bg-green-300 dark:bg-green-700"></div>
                  </div>
                  <div className="flex justify-center mb-1">
                    <div className="relative w-1/2 h-px">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-300 dark:via-green-700 to-transparent"></div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-green-300 dark:from-green-700 to-green-500"></div>
                  </div>

                  {/* Reviewer */}
                  <div className="relative">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-xl shadow-green-500/20">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-300 inline-block animate-pulse"></span>
                        <span className="text-lg font-bold">🔍 Reviewer</span>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">품질 검수</span>
                      </div>
                      <p className="text-center text-sm text-green-100">실시간 피드백 루프 · 87+/100 품질 보장</p>
                      <div className="text-center mt-2">
                        <span className="text-xs bg-white/15 px-3 py-1 rounded-full">Claude Sonnet 4.5 · 자동 QA</span>
                      </div>
                    </div>
                    {/* Feedback loop arrow */}
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center">
                      <div className="w-12 h-px bg-yellow-400"></div>
                      <div className="w-px h-24 bg-gradient-to-t from-yellow-400 to-transparent -mt-px ml-12 absolute right-0 -top-12"></div>
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-400 absolute -top-16 right-0 whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">↻ 피드백</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex justify-center gap-6 mt-6 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                      <span>활성</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-300 inline-block animate-pulse"></span>
                      <span>검수 중</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-px bg-blue-400 inline-block"></span>
                      <span>데이터 흐름</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Document References Tab ── */
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Document Types */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📚 생성 가능한 문서 유형</h3>
                      <div className="space-y-3">
                        {[
                          { icon: '🏛️', name: '국가 사업계획서', count: '12 템플릿' },
                          { icon: '💻', name: '개발 기획서', count: '12 템플릿' },
                          { icon: '🔬', name: '연구 보고서', count: '12 템플릿' },
                          { icon: '📈', name: '비즈니스 계획서', count: '12 템플릿' },
                          { icon: '📣', name: '마케팅 전략서', count: '12 템플릿' },
                          { icon: '💰', name: '투자 유치서', count: '12 템플릿' },
                          { icon: '⚙️', name: '기술 백서', count: '12 템플릿' },
                        ].map((doc, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                            <span className="text-xl">{doc.icon}</span>
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{doc.count}</span>
                          </div>
                        ))}
                      </div>

                      {/* Format support */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">출력 포맷</h4>
                        <div className="flex gap-2">
                          <span className="px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800">PDF</span>
                          <span className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-lg border border-orange-200 dark:border-orange-800">HTML</span>
                          <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800">웹 뷰어</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quality Metrics + Sample Output */}
                    <div className="space-y-6">
                      {/* Quality Metrics */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📊 품질 점수 분석</h3>
                        <div className="space-y-3">
                          {[
                            { label: '논리적 구조', score: 92, color: 'bg-blue-500' },
                            { label: '콘텐츠 깊이', score: 89, color: 'bg-purple-500' },
                            { label: '전문성·정확도', score: 88, color: 'bg-green-500' },
                            { label: '문서 완결성', score: 91, color: 'bg-orange-500' },
                            { label: '가독성·포맷', score: 87, color: 'bg-pink-500' },
                          ].map((metric, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700 dark:text-gray-300">{metric.label}</span>
                                <span className="font-bold text-gray-900 dark:text-white">{metric.score}/100</span>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full ${metric.color} rounded-full transition-all`} style={{ width: `${metric.score}%` }}></div>
                              </div>
                            </div>
                          ))}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                            <span className="font-semibold text-gray-900 dark:text-white">종합 품질 점수</span>
                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">87+ / 100</span>
                          </div>
                        </div>
                      </div>

                      {/* Sample Output Sections */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📝 샘플 섹션 구조</h3>
                        <div className="space-y-2">
                          {[
                            '1. 사업 개요 및 배경',
                            '2. 시장 분석 및 경쟁 환경',
                            '3. 기술 아키텍처 설계',
                            '4. 세부 추진 전략',
                            '5. 소요 예산 및 재원 조달',
                            '⋯ 총 20~30개 섹션 자동 생성',
                          ].map((section, i) => (
                            <div key={i} className={`flex items-center gap-2 text-sm ${i === 5 ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-700 dark:text-gray-300'}`}>
                              {i < 5 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>}
                              <span>{section}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                          각 섹션은 500~1,000자의 전문 콘텐츠로 구성되며, AI 이미지 큐레이션 및 차트가 자동 포함됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 템플릿 섹션 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">템플릿</h2>
              </div>

              {/* 카테고리 탭 */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 템플릿 그리드 — Skywork-level premium cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredTemplates.map((template, index) => {
                  const grad = CATEGORY_GRADIENTS[template.category] || DEFAULT_GRADIENT;
                  const sectionCount = template.sections?.length || 20;
                  const estTime = sectionCount > 20 ? '10-12분' : '8-10분';
                  return (
                    <button
                      key={index}
                      onClick={() => handleCreateClick(template)}
                      className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden text-left"
                    >
                      {/* Gradient Document Preview Thumbnail */}
                      <div className={`relative h-36 bg-gradient-to-br ${grad.from} ${grad.to} p-4 overflow-hidden`}>
                        {/* Faint document lines effect */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="mt-6 ml-4 mr-4 space-y-2">
                            <div className="h-1.5 bg-white rounded w-3/4"></div>
                            <div className="h-1 bg-white rounded w-full"></div>
                            <div className="h-1 bg-white rounded w-5/6"></div>
                            <div className="h-1 bg-white rounded w-full"></div>
                            <div className="h-1 bg-white rounded w-2/3"></div>
                            <div className="h-1 bg-white rounded w-full"></div>
                            <div className="h-1 bg-white rounded w-4/5"></div>
                          </div>
                        </div>
                        {/* Category icon */}
                        <div className="absolute top-3 right-3 text-2xl opacity-30 group-hover:opacity-60 transition-opacity">
                          {grad.icon}
                        </div>
                        {/* Mini paper preview */}
                        <div className="relative bg-white/95 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg p-3 w-full h-full flex flex-col">
                          <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">{template.subtitle}</div>
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">{template.title}</div>
                          <div className="mt-auto space-y-1 pt-2">
                            <div className="h-[3px] bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-[3px] bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                            <div className="h-[3px] bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
                          </div>
                        </div>
                        {/* Hover CTA overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                            시작하기 →
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4">
                        {/* Category pill badge */}
                        <div className="mb-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${grad.badge} ${grad.badgeText}`}>
                            <span>{grad.icon}</span>
                            {template.category}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {template.title}
                        </h3>

                        {/* Description (2 lines max) */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
                          {template.desc}
                        </p>

                        {/* Section preview (first 2-3 section titles) */}
                        {template.sections && template.sections.length > 0 && (
                          <div className="mb-3 space-y-0.5">
                            {template.sections.slice(0, 2).map((s: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></span>
                                <span className="truncate">{s}</span>
                              </div>
                            ))}
                            {template.sections.length > 2 && (
                              <div className="text-[10px] text-gray-300 dark:text-gray-600 pl-2.5">
                                +{template.sections.length - 2}개 섹션
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer: section count + estimated time */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">📑</span>
                            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{sectionCount}개 섹션</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">⏱️</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">{estTime}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            {!isLoggedIn && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => router.push('/register')}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg"
                >
                  Plan-Craft에 가입하여 무료로 시작하기 →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-8 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Plan-Craft v3.0</p>
            <p>Claude Opus 4.6 Agent Teams · 87+/100 품질 · 8-10분 생성 · 병렬 처리</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
