'use client';

import { useState } from 'react';
import api from '../lib/api';
import { t } from '../lib/i18n';

interface ShareModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ projectId, isOpen, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit' | 'comment'>('view');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createShareLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/api/share/${projectId}/share`, {
        permission,
        password: usePassword ? password : undefined,
        expiresInDays: expiry,
      });
      setShareUrl(res.data.shareUrl);
    } catch (e) {
      console.error('Share failed:', e);
      setError('공유 링크 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShareUrl('');
    setCopied(false);
    setError('');
    setPassword('');
    setUsePassword(false);
    setExpiry(null);
    setPermission('view');
    onClose();
  };

  if (!isOpen) return null;

  const permissions: { value: 'view' | 'edit' | 'comment'; label: string; icon: string }[] = [
    { value: 'view', label: t('share.view'), icon: '👁️' },
    { value: 'edit', label: t('share.edit'), icon: '✏️' },
    { value: 'comment', label: t('share.comment'), icon: '💬' },
  ];

  const expiryOptions: { value: number | null; label: string }[] = [
    { value: 7, label: t('share.expiry7') },
    { value: 30, label: t('share.expiry30') },
    { value: null, label: t('share.expiryNone') },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🔗 {t('share.title')}
            </h2>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Permission Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('share.permission')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {permissions.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPermission(p.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                    permission === p.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="block text-lg mb-0.5">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Password Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                🔒 {t('share.password')}
              </label>
              <button
                onClick={() => setUsePassword(!usePassword)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  usePassword ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    usePassword ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {usePassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('share.passwordPlaceholder')}
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            )}
          </div>

          {/* Expiry Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              ⏰ {t('share.expiry')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {expiryOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setExpiry(opt.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                    expiry === opt.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Generate / URL Display */}
          {!shareUrl ? (
            <button
              onClick={createShareLink}
              disabled={loading || (usePassword && !password)}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  {t('share.generating')}
                </>
              ) : (
                <>🔗 {t('share.generate')}</>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none truncate"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied ? `✅ ${t('share.copied')}` : `📋 ${t('share.copy')}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
