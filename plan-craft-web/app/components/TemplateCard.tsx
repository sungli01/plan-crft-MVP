'use client';

import type { RichTemplate } from '../data/templates';

/* ── Category style config ── */
const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  '국가 사업': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: '🏛️' },
  '개발 기획': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', icon: '💻' },
  '연구 보고': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', icon: '🔬' },
  '비즈니스': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', icon: '📈' },
  '마케팅': { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', icon: '📣' },
  '투자 유치': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', icon: '💰' },
  '기술 문서': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', icon: '⚙️' },
};

const DEFAULT_STYLE = { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: '📄' };

interface TemplateCardProps {
  template: RichTemplate;
  onClick: (template: RichTemplate) => void;
}

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  const style = CATEGORY_STYLES[template.category] || DEFAULT_STYLE;

  return (
    <button
      onClick={() => onClick(template)}
      className="group bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-5 text-left hover:border-transparent hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      {/* Category badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-3 self-start ${style.bg} ${style.text}`}>
        <span>{style.icon}</span>
        <span>{template.category}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {template.title}
      </h3>

      {/* Subtitle */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        {template.subtitle}
      </p>

      {/* Description — shown on hover */}
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {template.desc}
        </p>
      </div>

      {/* Footer — section count */}
      <div className="flex items-center justify-between pt-3 mt-auto border-t border-gray-100 dark:border-gray-700/50">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {template.sections?.length || 20}개 섹션
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          시작하기 →
        </span>
      </div>
    </button>
  );
}
