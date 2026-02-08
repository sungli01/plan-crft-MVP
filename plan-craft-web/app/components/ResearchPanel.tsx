'use client';

import { useState } from 'react';

interface Paper {
  title: string;
  authors: string;
  year: number | null;
  abstract: string;
  url: string;
  source: 'semantic-scholar' | 'arxiv';
  citationCount: number;
}

export interface ResearchData {
  keywords: string[];
  papers: Paper[];
  summary: string;
  references: string[];
  referenceLinks: { name: string; url: string; type: string }[];
  stats: { semanticScholar: number; arxiv: number; totalPapers: number };
}

export default function ResearchPanel({ data }: { data: ResearchData | null }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'papers' | 'references'>('summary');

  if (!data) return null;

  const tabs = [
    { key: 'summary' as const, label: '요약' },
    { key: 'papers' as const, label: '논문 목록' },
    { key: 'references' as const, label: '참고문헌' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-6">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔬</span>
          <h3 className="text-lg font-bold text-white">심층 연구 결과</h3>
          <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded-full text-xs font-semibold text-white">
            Pro
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-white transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Stats bar - always visible */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4 text-sm">
        <span className="font-semibold text-gray-900 dark:text-white">
          📊 {data.stats.totalPapers} 논문 발견
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-blue-600 dark:text-blue-400">
          Semantic Scholar: {data.stats.semanticScholar}
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-orange-600 dark:text-orange-400">
          arXiv: {data.stats.arxiv}
        </span>
      </div>

      {/* Keywords */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
        {data.keywords.map((kw, idx) => (
          <span
            key={idx}
            className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800"
          >
            {kw}
          </span>
        ))}
      </div>

      {/* Expandable content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 border border-b-0 border-gray-200 dark:border-gray-600 -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Summary tab */}
          {activeTab === 'summary' && (
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {data.summary}
              </p>
            </div>
          )}

          {/* Papers tab */}
          {activeTab === 'papers' && (
            <div className="grid gap-4 md:grid-cols-2">
              {data.papers.map((paper, idx) => (
                <a
                  key={idx}
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-2 flex-1">
                      {paper.title}
                    </h4>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                        paper.source === 'semantic-scholar'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                      }`}
                    >
                      {paper.source === 'semantic-scholar' ? 'S2' : 'arXiv'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {paper.authors} {paper.year ? `(${paper.year})` : ''}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                    {paper.abstract}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>📊 인용 {paper.citationCount.toLocaleString()}회</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* References tab */}
          {activeTab === 'references' && (
            <div className="space-y-6">
              {/* APA citations */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  📚 참고문헌 목록
                </h4>
                <ol className="space-y-2 list-decimal list-inside">
                  {data.references.map((ref, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-2"
                    >
                      {ref}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Reference links */}
              {data.referenceLinks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    🔗 참고 링크
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.referenceLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition text-sm"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400">↗</span>
                        <span className="text-gray-900 dark:text-white font-medium flex-1 truncate">
                          {link.name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {link.type}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
