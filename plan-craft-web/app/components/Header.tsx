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
    initLocale();
    setCurrentLang(getLocale());
  }, []);

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
    window.location.reload();
  };

  const currentLocaleInfo = SUPPORTED_LOCALES.find((l) => l.code === currentLang) || SUPPORTED_LOCALES[0];

  return (
    <header className="hidden lg:block sticky top-0 z-30 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/50">
      <div className="flex items-center justify-end h-12 px-6 gap-2">
        {/* Usage badge */}
        {isLoggedIn && <UsageBadge />}

        {/* Language Switcher */}
        {mounted && (
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
              title="Language"
            >
              <span className="text-sm">{currentLocaleInfo.flag}</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1 animate-slide-down">
                {SUPPORTED_LOCALES.map((locale) => (
                  <button
                    key={locale.code}
                    onClick={() => handleLanguageChange(locale.code)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                      currentLang === locale.code
                        ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{locale.flag}</span>
                    <span>{locale.name}</span>
                    {currentLang === locale.code && <span className="ml-auto text-blue-500">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
            title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        )}

        {/* Notifications bell */}
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 relative">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Auth */}
        {!isLoggedIn ? (
          <div className="flex items-center gap-2 ml-1">
            <button onClick={() => router.push('/login')} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              로그인
            </button>
            <button onClick={() => router.push('/register')} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              시작하기
            </button>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center ml-1 cursor-pointer" title={user?.name || user?.email}>
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
