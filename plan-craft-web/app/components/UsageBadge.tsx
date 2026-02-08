'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

interface UsageData {
  tier: string;
  usage: {
    monthly: number;
    limit: number;
    remaining: number;
  };
  features: {
    maxSections: number;
    model: string;
    deepResearch: boolean;
    priorityQueue: boolean;
  };
}

export default function UsageBadge() {
  const router = useRouter();
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    api
      .get('/api/usage')
      .then((res) => setData(res.data))
      .catch(() => {
        // silently fail — badge just won't show
      });
  }, []);

  if (!data) return null;

  const isPro = data.tier === 'pro';
  const isUnlimited = data.usage.limit < 0;
  const used = data.usage.monthly;
  const limit = data.usage.limit;
  const pct = isUnlimited ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const nearLimit = !isUnlimited && limit > 0 && data.usage.remaining <= 1;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push('/pricing')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
      >
        {/* Tier badge */}
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
            isPro
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
        >
          {data.tier}
        </span>

        {/* Usage text */}
        {isUnlimited ? (
          <span className="text-gray-600 dark:text-gray-300">무제한</span>
        ) : (
          <>
            {/* Mini progress bar */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  nearLimit ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`${nearLimit ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
              {used}/{limit}
            </span>
          </>
        )}

        {/* Upgrade nudge */}
        {nearLimit && (
          <span className="text-red-500 text-[10px] font-semibold">업그레이드</span>
        )}
      </button>
    </div>
  );
}
