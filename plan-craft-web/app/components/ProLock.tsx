'use client';

import { useState, useEffect } from 'react';

interface ProLockProps {
  feature: string;
  children: React.ReactNode;
  isPro?: boolean;
}

export default function ProLock({ feature, children, isPro: isProProp }: ProLockProps) {
  const [isPro, setIsPro] = useState<boolean | null>(isProProp ?? null);

  useEffect(() => {
    if (isProProp !== undefined) {
      setIsPro(isProProp);
      return;
    }

    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsPro(user.plan === 'pro' || user.plan === 'enterprise');
      } else {
        setIsPro(false);
      }
    } catch {
      setIsPro(false);
    }
  }, [isProProp]);

  // Still loading
  if (isPro === null) {
    return <>{children}</>;
  }

  // Pro user: render children normally
  if (isPro) {
    return <>{children}</>;
  }

  // Free user: show locked overlay
  return (
    <div className="relative">
      {/* Blurred content underneath */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] rounded-xl z-10">
        <div className="text-center px-6 py-8 max-w-sm">
          {/* Lock icon */}
          <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
            <svg className="w-7 h-7 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            Pro 전용 기능
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            <span className="font-medium text-gray-700 dark:text-gray-300">{feature}</span> 기능은
            Pro 플랜 사용자에게 제공됩니다.
          </p>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span>🔒</span>
            <span>관리자에게 Pro 권한을 요청하세요</span>
          </div>
        </div>
      </div>
    </div>
  );
}
