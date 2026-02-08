'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import { useToast } from './components/Toast';
import api from './lib/api';
import TEMPLATES, { type RichTemplate } from './data/templates';

/* ══════════════════════════════════════════════════════ */
/*  Category config — always colorful gradient icons     */
/* ══════════════════════════════════════════════════════ */
const CATEGORIES = [
  { id: 'all', label: '전체', icon: '✨', gradient: 'from-indigo-400 to-purple-500', ring: 'ring-indigo-400', category: undefined as string | undefined },
  { id: 'business-plan', label: '사업계획서', icon: '📄', gradient: 'from-blue-400 to-blue-600', ring: 'ring-blue-400', category: '비즈니스' },
  { id: 'market', label: '시장분석', icon: '📊', gradient: 'from-emerald-400 to-emerald-600', ring: 'ring-emerald-400', category: '마케팅' },
  { id: 'invest', label: '투자유치', icon: '💰', gradient: 'from-amber-400 to-orange-500', ring: 'ring-amber-400', category: '투자 유치' },
  { id: 'research', label: '연구보고서', icon: '🔬', gradient: 'from-violet-400 to-purple-600', ring: 'ring-violet-400', category: '연구 보고', pro: true },
  { id: 'gov', label: '국가사업', icon: '🏢', gradient: 'from-rose-400 to-red-500', ring: 'ring-rose-400', category: '국가 사업' },
  { id: 'mockup', label: '목업사이트', icon: '🎨', gradient: 'from-pink-400 to-fuchsia-500', ring: 'ring-pink-400', pro: true, category: undefined as string | undefined },
  { id: 'marketing', label: '마케팅', icon: '📈', gradient: 'from-cyan-400 to-teal-500', ring: 'ring-cyan-400', category: '마케팅' },
  { id: 'tech', label: '기술문서', icon: '⚙️', gradient: 'from-slate-400 to-gray-600', ring: 'ring-slate-400', category: '기술 문서' },
  { id: 'dev', label: '개발기획', icon: '💻', gradient: 'from-sky-400 to-blue-500', ring: 'ring-sky-400', category: '개발 기획' },
];

/* ── Sample popular projects ── */
const POPULAR_PROJECTS = [
  { id: 'pop-1', title: 'AI 물류 최적화 플랫폼', desc: '딥러닝 기반 라스트마일 배송 최적화', gradient: 'from-blue-500 to-indigo-600', category: '사업계획서', templateId: '' },
  { id: 'pop-2', title: '스마트팜 자동화 시스템', desc: 'IoT 센서 기반 정밀 농업 모니터링', gradient: 'from-emerald-500 to-green-600', category: '국가 사업', templateId: 'gov-smart-farm' },
  { id: 'pop-3', title: 'SaaS 프로젝트 관리 도구', desc: 'Jira 대체 클라우드 네이티브 솔루션', gradient: 'from-violet-500 to-purple-600', category: '개발 기획', templateId: 'dev-saas-pm' },
  { id: 'pop-4', title: '전고체 배터리 연구', desc: '황화물계 고체전해질 소재 기술 분석', gradient: 'from-amber-500 to-orange-600', category: '연구 보고', templateId: 'res-solid-battery' },
  { id: 'pop-5', title: '글로벌 이커머스 진출', desc: '동남아 크로스보더 마케팅 전략', gradient: 'from-rose-500 to-pink-600', category: '투자 유치', templateId: 'biz-cross-border' },
  { id: 'pop-6', title: 'AI 의료 영상 진단', desc: 'CT/MRI 딥러닝 분석 솔루션', gradient: 'from-cyan-500 to-teal-600', category: '국가 사업', templateId: 'gov-ai-medical' },
  { id: 'pop-7', title: '디지털 트윈 스마트공장', desc: '실시간 시뮬레이션 예측 정비', gradient: 'from-sky-500 to-blue-600', category: '기술 문서', templateId: 'gov-digital-twin' },
  { id: 'pop-8', title: '생성형 AI 모델 연구', desc: 'LLM 한국어 특화 파인튜닝', gradient: 'from-fuchsia-500 to-purple-600', category: '연구 보고', templateId: 'res-generative-ai' },
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

/* ── File type icon helpers ── */
const FILE_ACCEPT = ".pdf,.xlsx,.xls,.pptx,.ppt,.docx,.doc,.hwp,.csv,.jpg,.jpeg,.png,.txt,.md";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
  if (['pptx', 'ppt'].includes(ext)) return '📽️';
  if (['docx', 'doc'].includes(ext)) return '📝';
  if (ext === 'pdf') return '📕';
  if (ext === 'hwp') return '📃';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  if (['txt', 'md'].includes(ext)) return '📄';
  return '📎';
}

/* ── URL detection ── */
const URL_REGEX = /https?:\/\/[^\s]+/g;

interface RecentProject {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

interface AttachedLink {
  url: string;
}

/* ══════════════════════════════════════════════════════ */
/*  TemplateDetailModal — full sections, 2-col, scroll   */
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="overflow-y-auto p-8" style={{ maxHeight: 'calc(80vh - 2px)' }}>
          {/* Category + meta badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {template.category}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              ⏱️ 8-10분
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              📊 {template.sections.length}개 섹션
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 pr-10">
            📄 {template.title}
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">{template.subtitle}</p>

          {/* Overview — full text, 3-5 lines */}
          <div className="mb-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              📌 개요
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {template.overview}
            </p>
          </div>

          {/* Sections — full list, 2-col grid for 10+ */}
          <div className="mb-8">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              📋 문서 구조 <span className="text-xs font-normal text-gray-400">({template.sections.length}개 섹션)</span>
            </h3>
            <div className={`${template.sections.length > 8 ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2'}`}>
              {template.sections.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 group"
                >
                  {/* Number circle */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow-md shadow-blue-500/20">
                    {i + 1}
                  </div>
                  {/* Section title — NO truncate */}
                  <div className="flex-1 py-1.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors duration-200">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-snug">
                      {s.replace(/^\d+\.\s*/, '')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
              🏷️ 키워드
            </h3>
            <div className="flex flex-wrap gap-2">
              {template.keywords.map((kw) => (
                <span key={kw} className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onSelect(template)}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              이 템플릿으로 프로젝트 생성
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 active:scale-[0.98]"
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
/*  CategoryDropdown — shows ALL templates for category  */
/* ══════════════════════════════════════════════════════ */
function CategoryDropdown({
  category,
  anchorRef,
  onClose,
  onTemplateClick,
}: {
  category: typeof CATEGORIES[number];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onTemplateClick: (t: RichTemplate) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter templates by category — show ALL matching
  const templates = category.id === 'all'
    ? TEMPLATES.slice(0, 12)
    : TEMPLATES.filter((t) => t.category === category.category);

  // Close on outside click or ESC
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, anchorRef]);

  if (templates.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-gray-300/30 dark:shadow-black/40 z-50 py-2"
      style={{ maxHeight: '320px' }}
    >
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {category.label} 템플릿 ({templates.length})
        </p>
      </div>
      <div className="overflow-y-auto py-1" style={{ maxHeight: '264px' }}>
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => { onTemplateClick(tpl); onClose(); }}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150 group"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors flex-1">
                {tpl.title}
              </p>
              <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {tpl.sections.length}섹션
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {tpl.desc}
            </p>
          </button>
        ))}
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

  // Attached files & links state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedLinks, setAttachedLinks] = useState<AttachedLink[]>([]);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Category dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const categoryRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  // Tab state for popular/recent — default to "popular"
  const [activeTab, setActiveTab] = useState<'popular' | 'recent'>('popular');

  // Prompt bar focus state
  const [promptFocused, setPromptFocused] = useState(false);

  // Ref for prompt bar container (for drag-drop)
  const promptBarRef = useRef<HTMLDivElement>(null);

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

  /* ── File attachment handlers ── */
  const addFiles = useCallback((files: FileList | File[]) => {
    const validFiles: File[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`파일 크기 초과: ${file.name} (최대 10MB)`, 'error');
      } else {
        validFiles.push(file);
      }
    });
    if (validFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...validFiles]);
    }
  }, [showToast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset input so the same file can be re-attached
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addFiles]);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeLink = useCallback((index: number) => {
    setAttachedLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ── Drag & drop handlers ── */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  }, [addFiles]);

  /* ── URL detection on paste ── */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    const urls = pasted.match(URL_REGEX);
    if (urls && urls.length > 0) {
      e.preventDefault();
      const newLinks = urls.map((url) => ({ url }));
      setAttachedLinks((prev) => [...prev, ...newLinks]);
      // If the entire pasted text is just URLs, don't add to searchText
      const remaining = pasted.replace(URL_REGEX, '').trim();
      if (remaining) {
        setSearchText((prev) => prev + remaining);
      }
    }
  }, []);

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
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setModalTemplate(tpl);
    } else {
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
    setModalTemplate(null);
  };

  const clearSelectedTemplate = () => setSelectedTemplate(null);

  /* ── Category handling ── */
  const handleCategoryClick = (catId: string) => {
    // "전체" → just reset filter, no dropdown
    if (catId === 'all') {
      setSelectedCategory('all');
      setOpenDropdown(null);
      return;
    }
    if (openDropdown === catId) {
      setOpenDropdown(null);
    } else {
      setSelectedCategory(catId);
      setOpenDropdown(catId);
    }
  };

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

  const filteredPopular = getFilteredPopular().slice(0, 4);
  const hasAttachments = attachedFiles.length > 0 || attachedLinks.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-[#0d1117] dark:to-[#0d1117]">
      {/* Hidden file input — full accept list */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={FILE_ACCEPT}
        multiple
        onChange={handleFileChange}
      />

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-20">

          {/* ═══════════════════════════════════════════ */}
          {/*  TITLE                                      */}
          {/* ═══════════════════════════════════════════ */}
          <div className="text-center mb-14 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-[#e6edf3] mb-4 leading-tight tracking-tight">
              AI 멀티에이전트가 만드는
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                전문가급 사업계획서
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
              아이디어를 입력하면 멀티에이전트가 협업하여<br className="hidden sm:block" /> 완성도 높은 문서를 자동 생성합니다
            </p>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  PROMPT BAR — Premium Design + Drag & Drop  */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-16">
            <div
              ref={promptBarRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`
                relative bg-white dark:bg-[#161b22] rounded-2xl
                border transition-all duration-300
                ${isDragging
                  ? 'border-blue-400 dark:border-blue-500 shadow-xl shadow-blue-200/40 dark:shadow-blue-900/30 ring-2 ring-blue-300/60 dark:ring-blue-700/40'
                  : promptFocused
                    ? 'border-blue-400/70 dark:border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)] dark:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
                    : 'border-gray-300/50 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-black/30 hover:shadow-xl hover:shadow-gray-300/50 dark:hover:shadow-black/40'
                }
              `}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-20 rounded-2xl bg-blue-50/90 dark:bg-blue-900/30 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">파일을 놓으세요</span>
                  </div>
                </div>
              )}

              {/* Top row: Agent label + Pro toggle */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide">에이전트</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-semibold">멀티에이전트</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setProMode(!proMode)}
                    className="flex items-center gap-1.5 group"
                  >
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">Pro</span>
                    <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${proMode ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                      <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${proMode ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Attached files & links display */}
              {hasAttachments && (
                <div className="px-5 pb-2 flex flex-wrap gap-2">
                  {attachedFiles.map((file, idx) => (
                    <span
                      key={`file-${file.name}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                    >
                      {getFileIcon(file.name)} {file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name}
                      <button
                        onClick={() => removeFile(idx)}
                        className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {attachedLinks.map((link, idx) => (
                    <span
                      key={`link-${idx}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700"
                    >
                      🔗 {link.url.length > 30 ? link.url.slice(0, 28) + '…' : link.url}
                      <button
                        onClick={() => removeLink(idx)}
                        className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Selected template tag */}
              {selectedTemplate && (
                <div className="px-5 pb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
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
              <div className="flex items-center px-5 pb-4 gap-3 min-h-16">
                <input
                  type="text"
                  value={searchText}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  onFocus={() => setPromptFocused(true)}
                  onBlur={() => setPromptFocused(false)}
                  placeholder={selectedTemplate ? '추가 지시사항을 입력하세요...' : '사업 아이디어를 입력하세요...'}
                  className="flex-1 py-3 text-sm sm:text-base bg-transparent border-none focus:outline-none text-gray-900 dark:text-[#e6edf3] placeholder-gray-400 dark:placeholder-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (searchText.trim() || selectedTemplate)) handleCreate();
                  }}
                />
                <div className="flex items-center gap-2.5">
                  {/* Attachment */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 active:scale-95"
                    title="파일 첨부 (PDF, Excel, PPT, Word, HWP, CSV, 이미지, 텍스트)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  {/* Send */}
                  <button
                    onClick={handleCreate}
                    disabled={!searchText.trim() && !selectedTemplate}
                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-200 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 disabled:shadow-none active:scale-95"
                  >
                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick suggestions */}
            <div className="flex items-center gap-2.5 mt-4 flex-wrap justify-center">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">예시:</span>
              {['AI 물류 플랫폼 사업', '스마트팜 국가과제', 'SaaS 개발 기획', '시장분석 보고서'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSearchText(s)}
                  className="px-3.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all duration-200 active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  CATEGORY ICONS — overflow-visible fix      */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-16">
            <h2 className="font-semibold text-xl tracking-tight text-gray-900 dark:text-white text-center mb-6">카테고리</h2>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto overflow-y-visible pb-4 scrollbar-hide justify-start sm:justify-center" style={{ overflow: 'visible' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const isOpen = openDropdown === cat.id;
                return (
                  <div key={cat.id} className="relative flex flex-col items-center overflow-visible" style={{ overflow: 'visible' }}>
                    <button
                      ref={(el) => { categoryRefs.current.set(cat.id, el); }}
                      onClick={() => handleCategoryClick(cat.id)}
                      className="flex flex-col items-center gap-2 min-w-[64px] group"
                    >
                      <div
                        className={`
                          relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center
                          bg-gradient-to-br ${cat.gradient}
                          transition-all duration-200 ease-out
                          shadow-md
                          ${isSelected
                            ? `scale-110 shadow-lg ring-3 ${cat.ring} ring-offset-2 ring-offset-white dark:ring-offset-[#0d1117]`
                            : 'hover:scale-105 hover:shadow-lg'
                          }
                        `}
                      >
                        <span className="text-xl sm:text-2xl drop-shadow-sm">{cat.icon}</span>
                        {cat.pro && (
                          <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-sm">
                            PRO
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                      }`}>
                        {cat.label}
                      </span>
                    </button>

                    {/* Dropdown — positioned with z-50, overflow-visible parent */}
                    {isOpen && (
                      <CategoryDropdown
                        category={cat}
                        anchorRef={{ current: categoryRefs.current.get(cat.id) ?? null }}
                        onClose={() => setOpenDropdown(null)}
                        onTemplateClick={(tpl) => setModalTemplate(tpl)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  인기/최근 프로젝트 — Tabs on same line     */}
          {/* ═══════════════════════════════════════════ */}
          <div className="mb-16">
            {/* Tab header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('popular')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    activeTab === 'popular'
                      ? 'bg-white dark:bg-[#161b22] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  🔥 인기 프로젝트
                </button>
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    activeTab === 'recent'
                      ? 'bg-white dark:bg-[#161b22] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  🕐 최근 프로젝트
                </button>
              </div>
              {activeTab === 'recent' && isLoggedIn && (
                <button
                  onClick={() => router.push('/projects')}
                  className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  더보기 →
                </button>
              )}
              {activeTab === 'popular' && (
                <button
                  onClick={() => {/* could link to a templates page */}}
                  className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  더보기 →
                </button>
              )}
            </div>

            {/* Tab content */}
            {activeTab === 'popular' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPopular.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handlePopularClick(project.templateId, project.title, project.desc)}
                    className="group relative overflow-hidden rounded-2xl aspect-[4/3] text-left transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-800 active:scale-[0.98]"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-3 right-3 w-20 h-20 border-2 border-white/30 rounded-full" />
                      <div className="absolute bottom-6 left-5 w-10 h-10 border border-white/20 rounded-full" />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
                      <span className="text-[10px] sm:text-[11px] text-white/70 font-semibold mb-1 tracking-wide">{project.category}</span>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
                        {project.title}
                      </h3>
                      <p className="text-[10px] text-white/50 mt-1 line-clamp-1 hidden sm:block">{project.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'recent' && (
              <div>
                {!isLoggedIn ? (
                  <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-gray-700/50 border-dashed">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      프로젝트를 시작해보세요
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                      로그인하면 AI가 자동으로 전문가급 사업계획서를 생성해 드립니다
                    </p>
                    <button
                      onClick={() => router.push('/register')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      무료로 시작하기
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : loadingRecent ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="rounded-2xl aspect-[4/3] bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    ))}
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-gray-700/50 border-dashed">
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
                      아직 프로젝트가 없습니다. 위의 프롬프트에 아이디어를 입력해보세요!
                    </p>
                    <button
                      onClick={() => router.push('/create')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors font-semibold"
                    >
                      새 프로젝트 만들기 →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {recentProjects.slice(0, 4).map((project, idx) => (
                      <button
                        key={project.id}
                        onClick={() => router.push(`/project/${project.id}`)}
                        className="group relative overflow-hidden rounded-2xl aspect-[4/3] text-left transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-800 active:scale-[0.98]"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${CARD_GRADIENTS[idx % CARD_GRADIENTS.length]} opacity-85 group-hover:opacity-100 transition-opacity`} />
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-3 right-3 w-16 h-16 border-2 border-white/30 rounded-full" />
                        </div>
                        <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold ${
                              project.status === 'completed'
                                ? 'bg-white/20 text-white'
                                : project.status === 'generating'
                                ? 'bg-white/30 text-white'
                                : 'bg-white/15 text-white/80'
                            }`}>
                              {project.status === 'completed' ? '✅ 완료' : project.status === 'generating' ? '⏳ 생성 중' : '📝 초안'}
                            </span>
                            <span className="text-[9px] text-white/60 font-medium">{formatDate(project.createdAt)}</span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2">
                            {project.title}
                          </h3>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/*  BOTTOM CTA (non-logged-in)                 */}
          {/* ═══════════════════════════════════════════ */}
          {!isLoggedIn && (
            <section className="mt-8">
              <div className="bg-white dark:bg-[#161b22] border border-gray-100 dark:border-gray-800 rounded-2xl p-10 sm:p-14 max-w-xl mx-auto text-center shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  지금 바로 시작하세요
                </h2>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-8">
                  무료로 가입하고 AI가 만드는 전문가급 문서를 경험해보세요
                </p>
                <button
                  onClick={() => router.push('/register')}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
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
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Plan-Craft · AI 멀티에이전트 문서 생성 플랫폼 · 87+/100 품질 · 8-10분 완성
          </p>
        </div>
      </footer>
    </div>
  );
}
