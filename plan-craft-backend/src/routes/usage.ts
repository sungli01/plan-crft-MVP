/**
 * Usage Routes — tier & usage stats for the current user
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { db } from '../db/index';
import { projects } from '../db/schema-pg';
import { eq, and, gte } from 'drizzle-orm';
import { TIER_LIMITS } from '../middleware/tier';

const usageRouter = new Hono();

// GET /api/usage — user's usage stats
usageRouter.get('/', authMiddleware, async (c) => {
  const user = c.get('user') as any;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyProjects = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, user.id),
        gte(projects.createdAt, startOfMonth)
      )
    );

  const tier = (user.plan || 'free') as keyof typeof TIER_LIMITS;
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  return c.json({
    tier,
    usage: {
      monthly: monthlyProjects.length,
      limit: limits.monthlyGenerations,
      remaining:
        limits.monthlyGenerations > 0
          ? Math.max(0, limits.monthlyGenerations - monthlyProjects.length)
          : -1,
    },
    features: {
      maxSections: limits.maxSections,
      model: limits.model,
      deepResearch: tier === 'pro',
      priorityQueue: tier === 'pro',
    },
  });
});

export default usageRouter;
