'use client';

import { useEffect, useRef } from 'react';
import type { RichTemplate } from '../data/templates';

/* ── Category style config ── */
const CATEGORY_STYLES: Record<string, { gradient: string; icon: string; text: string }> = {
  '국가 사업': { gradient: 'from-blue-500 to-indigo-600', icon: '🏛️', text: 'text-blue-600 dark:text-blue-400' },
  '개발 기획': { gradient: 'from-violet-500 to-purple-600', icon: '💻', text: 'text-violet-600 dark:text-violet-400' },
  '연구 보고': { gradient: 'from-emerald-500 to-green-600', icon: '🔬', text: 'text-emerald-600 dark:text-emerald-400' },
  '비즈니스': { gradient: 'from-amber-500 to-orange-600', icon: '📈', text: 'text-amber-600 dark:text-amber-400' },
  '마케팅': { gradient: 'from-pink-500 to-rose-600', icon: '📣', text: 'text-pink-600 dark:text-pink-400' },
  '투자 유치': { gradient: 'from-indigo-500 to-blue-600', icon: '💰', text: 'text-indigo-600 dark:text-indigo-400' },
  '기술 문서': { gradient: 'from-teal-500 to-cyan-600', icon: '⚙️', text: 'text-teal-600 dark:text-teal-400' },
};
const DEFAULT_STYLE = { gradient: 'from-gray-500 to-gray-600', icon: '📄', text: 'text-gray-600 dark:text-gray-400' };

interface TemplateDetailModalProps {
  template: RichTemplate;
  onClose: () => void;
  onUseTemplate: (template: RichTemplate) => void;
}

export default function TemplateDetailModal({ template, onClose, onUseTemplate }: TemplateDetailModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const style = CATEGORY_STYLES[template.category] || DEFAULT_STYLE;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-white dark:bg-[#161b22] sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col">

        {/* ── Header with gradient ── */}
        <div className={`relative bg-gradient-to-br ${style.gradient} px-6 pt-6 pb-8`}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Decorative */}
          <div className="absolute top-3 right-16 w-20 h-20 border border-white/10 rounded-full" />
          <div className="absolute bottom-2 left-8 w-10 h-10 border border-white/10 rounded-full" />

          {/* Category + Title */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{style.icon}</span>
              <span className="text-sm font-medium text-white/80">{template.category}</span>
              <span className="text-white/40">·</span>
              <span className="text-sm text-white/60">{template.subtitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{template.title}</h2>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Description */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{template.desc}</p>
          </div>

          {/* Overview */}
          {template.overview && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">개요</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                {template.overview}
              </p>
            </div>
          )}

          {/* Section structure */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              문서 구조 · {template.sections?.length || 0}개 섹션
            </h3>
            <div className="space-y-1.5">
              {(template.sections || []).map((section, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                    {section.replace(/^\d+\.\s*/, '')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          {template.keywords && template.keywords.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">키워드</h3>
              <div className="flex flex-wrap gap-2">
                {template.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer: CTA ── */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-[#0d1117] flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            닫기
          </button>
          <button
            onClick={() => onUseTemplate(template)}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            이 템플릿으로 프로젝트 생성
          </button>
        </div>
      </div>
    </div>
  );
}
