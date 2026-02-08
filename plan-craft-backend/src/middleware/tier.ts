/**
 * Tier Check Middleware — Free/Pro usage limits
 */

import type { Context, Next } from 'hono';
import { db } from '../db/index';
import { projects } from '../db/schema-pg';
import { eq, and, gte } from 'drizzle-orm';

// Monthly generation limits
const TIER_LIMITS = {
  free: { monthlyGenerations: 3, maxSections: 15, model: 'sonnet' },
  pro: { monthlyGenerations: -1, maxSections: 30, model: 'opus' },
};

export function tierCheck() {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as any;
    const tier = user.plan || 'free';
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

    // Check monthly generation count for free users
    if (limits.monthlyGenerations > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyCount = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.userId, user.id),
            gte(projects.createdAt, startOfMonth)
          )
        );

      if (monthlyCount.length >= limits.monthlyGenerations) {
        return c.json(
          {
            error: `무료 플랜은 월 ${limits.monthlyGenerations}회까지 생성 가능합니다. Pro로 업그레이드하세요!`,
            code: 'TIER_LIMIT_REACHED',
            currentCount: monthlyCount.length,
            limit: limits.monthlyGenerations,
          },
          403
        );
      }
    }

    // Attach tier info to context
    c.set('tierLimits', limits);
    c.set('userTier', tier);

    await next();
  };
}

export { TIER_LIMITS };
