'use client';

import { useEffect, useState } from 'react';
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
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600"
      >
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
      </div>
    </div>
  );
}
