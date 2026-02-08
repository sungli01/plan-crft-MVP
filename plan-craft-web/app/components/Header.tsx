'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import type { User } from '../types';
import UsageBadge from './UsageBadge';
import { SUPPORTED_LOCALES, getLocale, setLocale as setI18nLocale, initLocale } from '../lib/i18n';
import type { Locale } from '../lib/i18n';

export default function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Locale>('ko');
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }
    // Initialize locale
    initLocale();
    setCurrentLang(getLocale());
  }, []);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (locale: Locale) => {
    setI18nLocale(locale);
    setCurrentLang(locale);
    setLangMenuOpen(false);
    // Reload to apply translations
    window.location.reload();
  };

  const currentLocaleInfo = SUPPORTED_LOCALES.find((l) => l.code === currentLang) || SUPPORTED_LOCALES[0];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    window.location.href = '/';
  };

  const navigate = (path: string) => {
    setMobileMenuOpen(false);
    router.push(path);
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4 sm:gap-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-lg font-bold">P</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Plan-Craft</span>
          </button>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/')} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">홈</button>
            {isLoggedIn && (
              <button onClick={() => navigate('/projects')} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">내 프로젝트</button>
            )}
            <button onClick={() => navigate('/templates')} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">템플릿</button>
            {isLoggedIn && user?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">관리자</button>
            )}
          </nav>
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language Switcher */}
          {mounted && (
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
                title="Language"
              >
                <span>{currentLocaleInfo.flag}</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 py-1">
                  {SUPPORTED_LOCALES.map((locale) => (
                    <button
                      key={locale.code}
                      onClick={() => handleLanguageChange(locale.code)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition ${
                        currentLang === locale.code
                          ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>{locale.flag}</span>
                      <span>{locale.name}</span>
                      {currentLang === locale.code && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}
          {!isLoggedIn ? (
            <>
              <button onClick={() => navigate('/login')} className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">로그인</button>
              <button onClick={() => navigate('/register')} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">무료 시작하기</button>
            </>
          ) : (
            <>
              <UsageBadge />
              <span className="text-sm text-gray-700 dark:text-gray-300">{user?.name || user?.email}</span>
              <button onClick={handleLogout} className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">로그아웃</button>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <div className="flex items-center gap-2 md:hidden">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-lg animate-slide-down">
          <nav className="px-4 py-3 space-y-1">
            <button
              onClick={() => navigate('/')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              🏠 홈
            </button>
            {isLoggedIn && (
              <button
                onClick={() => navigate('/projects')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                📁 내 프로젝트
              </button>
            )}
            <button
              onClick={() => navigate('/templates')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              📋 템플릿
            </button>
            {isLoggedIn && user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
              >
                ⚙️ 관리자
              </button>
            )}
          </nav>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            {!isLoggedIn ? (
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  로그인
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                  무료 시작하기
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                  👤 {user?.name || user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-sm text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
