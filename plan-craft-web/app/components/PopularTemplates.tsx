'use client';

import { useRouter } from 'next/navigation';
import TEMPLATES from '../data/templates';
import type { RichTemplate } from '../data/templates';
import api from '../lib/api';
import { useToast } from './Toast';

/* ── Category style config ── */
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; icon: string; hoverBg: string }> = {
  '국가 사업': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: '🏛️', hoverBg: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30' },
  '개발 기획': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', icon: '💻', hoverBg: 'group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30' },
  '연구 보고': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', icon: '🔬', hoverBg: 'group-hover:bg-green-100 dark:group-hover:bg-green-900/30' },
  '비즈니스': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', icon: '📈', hoverBg: 'group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30' },
  '마케팅': { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', icon: '📣', hoverBg: 'group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30' },
  '투자 유치': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', icon: '💰', hoverBg: 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30' },
  '기술 문서': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', icon: '⚙️', hoverBg: 'group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30' },
};

const DEFAULT_STYLE = { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', icon: '📄', hoverBg: 'group-hover:bg-gray-100 dark:group-hover:bg-gray-700' };

/* Pick 8 popular templates — one from each major category + extras */
const POPULAR_IDS = [
  'gov-smart-farm',
  'dev-saas-pm',
  'res-generative-ai',
  'biz-coffee-franchise',
  'dev-ai-chatbot',
  'biz-cross-border',
  'gov-ai-medical',
  'res-solid-battery',
];

function getPopularTemplates(): RichTemplate[] {
  const map = new Map(TEMPLATES.map(t => [t.id, t]));
  const result = POPULAR_IDS.map(id => map.get(id)).filter(Boolean) as RichTemplate[];
  // If some IDs missing, fill from start of TEMPLATES
  if (result.length < 8) {
    for (const t of TEMPLATES) {
      if (result.length >= 8) break;
      if (!result.find(r => r.id === t.id)) result.push(t);
    }
  }
  return result;
}

export default function PopularTemplates() {
  const router = useRouter();
  const { showToast } = useToast();
  const popularTemplates = getPopularTemplates();

  const handleClick = async (template: RichTemplate) => {
    const token = localStorage.getItem('token');
    if (!token) {
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

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">인기 템플릿</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">가장 많이 사용되는 문서 템플릿</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {popularTemplates.map((template) => {
          const style = CATEGORY_STYLES[template.category] || DEFAULT_STYLE;
          return (
            <button
              key={template.id}
              onClick={() => handleClick(template)}
              className="group relative bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-5 text-left hover:border-transparent hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              {/* Category icon badge */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-3 ${style.bg} ${style.text} ${style.hoverBg} transition-colors`}>
                <span>{style.icon}</span>
                <span>{template.category}</span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {template.title}
              </h3>

              {/* Description — visible on hover */}
              <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {template.desc}
              </p>

              {/* Arrow indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
