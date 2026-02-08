'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { t } from '../lib/i18n';

interface Version {
  id: string;
  version: number;
  qualityScore: number;
  wordCount: number;
  sectionCount: number;
  imageCount: number;
  createdAt: string;
}

interface VersionHistoryProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionHistory({ projectId, isOpen, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, projectId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/projects/${projectId}/versions`);
      setVersions(res.data.versions || []);
    } catch (e) {
      console.error('Failed to fetch versions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      await api.post(`/api/projects/${projectId}/versions/${versionId}/restore`);
      // Refresh versions after restore
      await fetchVersions();
    } catch (e) {
      console.error('Failed to restore version:', e);
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 8) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 6) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[90] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-96 max-w-full bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-[95] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📋 {t('versions.title')}
            {versions.length > 0 && (
              <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold px-2 py-0.5 rounded-full">
                {versions.length}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {t('versions.noVersions')}
              </p>
            </div>
          ) : (
            versions.map((version, index) => {
              const isLatest = index === 0;
              const prevVersion = versions[index + 1];
              const wordDiff = prevVersion
                ? version.wordCount - prevVersion.wordCount
                : 0;
              const scoreDiff = prevVersion
                ? version.qualityScore - prevVersion.qualityScore
                : 0;

              return (
                <div
                  key={version.id}
                  className={`relative rounded-xl p-4 border-2 transition ${
                    isLatest
                      ? 'border-purple-300 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Version Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        v{version.version}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">
                          {t('versions.current')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(version.createdAt)}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className={`rounded-lg p-2 text-center ${getScoreBg(version.qualityScore)}`}>
                      <div className={`text-lg font-bold ${getScoreColor(version.qualityScore)}`}>
                        {version.qualityScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('versions.quality')}
                      </div>
                      {prevVersion && scoreDiff !== 0 && (
                        <div className={`text-xs font-semibold ${scoreDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg p-2 text-center bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {version.wordCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('versions.words')}
                      </div>
                      {prevVersion && wordDiff !== 0 && (
                        <div className={`text-xs font-semibold ${wordDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {wordDiff > 0 ? '+' : ''}{wordDiff.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg p-2 text-center bg-gray-100 dark:bg-gray-600/30">
                      <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                        {version.sectionCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        섹션
                      </div>
                    </div>
                  </div>

                  {/* Restore Button */}
                  {!isLatest && (
                    <button
                      onClick={() => handleRestore(version.id)}
                      disabled={restoring === version.id}
                      className="w-full py-2 text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition disabled:opacity-50"
                    >
                      {restoring === version.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-600 border-t-transparent" />
                          {t('versions.restoring')}
                        </span>
                      ) : (
                        `🔄 ${t('versions.restore')}`
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
