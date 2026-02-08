'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProLockProps {
  feature: string;
  children: React.ReactNode;
  isPro?: boolean;
}

export default function ProLock({ feature, children, isPro: isProProp }: ProLockProps) {
  const router = useRouter();
  const [isPro, setIsPro] = useState<boolean | null>(isProProp ?? null);

  useEffect(() => {
    // If isPro prop provided, use it directly
    if (isProProp !== undefined) {
      setIsPro(isProProp);
      return;
    }

    // Otherwise check from localStorage user data
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
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] rounded-lg z-10">
        <div className="text-center px-6 py-8 max-w-sm">
          {/* Lock icon with pulse animation */}
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 animate-pulse">
            <span className="text-3xl">🔒</span>
          </div>

          <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            이 기능은 Pro 전용입니다
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            <span className="font-medium">{feature}</span> 기능을 사용하려면
            Pro 플랜으로 업그레이드하세요.
          </p>

          <button
            onClick={() => router.push('/pricing')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <span>💎</span>
            <span>업그레이드</span>
          </button>
        </div>
      </div>
    </div>
  );
}
