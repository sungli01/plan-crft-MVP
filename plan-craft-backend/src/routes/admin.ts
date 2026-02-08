/**
 * Admin Routes — User management & statistics
 */

import { Hono } from 'hono';
import { db, client } from '../db/index';
import { users, projects, tokenUsage } from '../db/schema-pg';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const admin = new Hono();

// All admin routes require auth + admin role
admin.use('*', authMiddleware, adminMiddleware);

// ─── GET /api/admin/users — 전체 사용자 목록 ──────────────────────────
admin.get('/users', async (c) => {
  try {
    const result = await client`
      SELECT
        u.id,
        u.email,
        u.name,
        u.plan,
        u.role,
        u.approved,
        u.created_at,
        u.updated_at,
        COALESCE(p.project_count, 0)::int AS project_count,
        COALESCE(t.total_tokens, 0)::bigint AS total_tokens,
        COALESCE(t.total_cost, 0)::float AS total_cost
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS project_count
        FROM projects
        GROUP BY user_id
      ) p ON p.user_id = u.id
      LEFT JOIN (
        SELECT user_id,
               SUM(total_tokens)::bigint AS total_tokens,
               SUM(cost_usd)::float AS total_cost
        FROM token_usage
        GROUP BY user_id
      ) t ON t.user_id = u.id
      ORDER BY u.created_at DESC
    `;

    return c.json({ users: result });
  } catch (error: any) {
    console.error('Admin users list error:', error);
    return c.json({ error: '사용자 목록 조회 실패', detail: error?.message }, 500);
  }
});

// ─── PATCH /api/admin/users/:id — 사용자 plan 변경 ────────────────────
admin.patch('/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const { plan } = body;

    if (!plan || !['free', 'pro'].includes(plan)) {
      return c.json({ error: 'plan은 "free" 또는 "pro"만 가능합니다' }, 400);
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    const [updated] = await db
      .update(users)
      .set({ plan, tier: plan, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return c.json({
      message: `사용자 플랜이 ${plan}으로 변경되었습니다`,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        role: updated.role,
        approved: updated.approved,
      },
    });
  } catch (error: any) {
    console.error('Admin update user error:', error);
    return c.json({ error: '사용자 플랜 변경 실패', detail: error?.message }, 500);
  }
});

// ─── PATCH /api/admin/users/:id/role — Admin 역할 부여/해제 ────────────
admin.patch('/users/:id/role', async (c) => {
  try {
    const userId = c.req.param('id');
    const adminUser = c.get('user') as any;
    const body = await c.req.json();
    const { role } = body;

    if (!role || !['user', 'admin'].includes(role)) {
      return c.json({ error: 'role은 "user" 또는 "admin"만 가능합니다' }, 400);
    }

    // 자기 자신의 admin 권한은 해제할 수 없음 (최소 1명 admin 보장)
    if (userId === adminUser.id && role === 'user') {
      // 다른 admin이 있는지 확인
      const otherAdmins = await client`
        SELECT COUNT(*)::int AS count FROM users 
        WHERE role = 'admin' AND id != ${userId}
      `;
      if (otherAdmins[0].count === 0) {
        return c.json({ error: '최소 1명의 관리자가 필요합니다. 다른 사용자를 먼저 관리자로 지정하세요.' }, 400);
      }
    }

    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return c.json({
      message: role === 'admin' 
        ? `${updated.email}에게 관리자 권한이 부여되었습니다`
        : `${updated.email}의 관리자 권한이 해제되었습니다`,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        role: updated.role,
        approved: updated.approved,
      },
    });
  } catch (error: any) {
    console.error('Admin role change error:', error);
    return c.json({ error: '역할 변경 실패', detail: error?.message }, 500);
  }
});

// ─── PATCH /api/admin/users/:id/approve — 사용자 승인 ─────────────────
admin.patch('/users/:id/approve', async (c) => {
  try {
    const userId = c.req.param('id');

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    if (existing.approved) {
      return c.json({ error: '이미 승인된 사용자입니다' }, 400);
    }

    const [updated] = await db
      .update(users)
      .set({ approved: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return c.json({
      message: '사용자가 승인되었습니다',
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        role: updated.role,
        approved: updated.approved,
      },
    });
  } catch (error: any) {
    console.error('Admin approve user error:', error);
    return c.json({ error: '사용자 승인 실패', detail: error?.message }, 500);
  }
});

// ─── DELETE /api/admin/users/:id — 사용자 삭제 ────────────────────────
admin.delete('/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const adminUser = c.get('user') as any;

    if (userId === adminUser.id) {
      return c.json({ error: '자기 자신은 삭제할 수 없습니다' }, 400);
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
    }

    // Delete related data first (cascade manually)
    await client`DELETE FROM token_usage WHERE user_id = ${userId}`;
    await client`DELETE FROM mockups WHERE user_id = ${userId}`;
    await client`DELETE FROM documents WHERE project_id IN (SELECT id FROM projects WHERE user_id = ${userId})`;
    await client`DELETE FROM projects WHERE user_id = ${userId}`;
    await db.delete(users).where(eq(users.id, userId));

    return c.json({
      message: '사용자가 삭제되었습니다',
      deletedUser: { id: existing.id, email: existing.email },
    });
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    return c.json({ error: '사용자 삭제 실패', detail: error?.message }, 500);
  }
});

// ─── GET /api/admin/stats — 전체 통계 ─────────────────────────────────
admin.get('/stats', async (c) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User counts
    const [userStats] = await client`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE approved = true)::int AS approved_users,
        COUNT(*) FILTER (WHERE approved = false)::int AS pending_users,
        COUNT(*) FILTER (WHERE plan = 'pro')::int AS pro_users,
        COUNT(*) FILTER (WHERE plan = 'free')::int AS free_users
      FROM users
    `;

    // Project count
    const [projectStats] = await client`
      SELECT COUNT(*)::int AS total_projects
      FROM projects
    `;

    // Daily token usage
    const [dailyTokens] = await client`
      SELECT
        COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
        COALESCE(SUM(cost_usd), 0)::float AS cost
      FROM token_usage
      WHERE created_at >= ${startOfDay.toISOString()}
    `;

    // Monthly token usage
    const [monthlyTokens] = await client`
      SELECT
        COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
        COALESCE(SUM(cost_usd), 0)::float AS cost
      FROM token_usage
      WHERE created_at >= ${startOfMonth.toISOString()}
    `;

    // All-time token usage
    const [allTimeTokens] = await client`
      SELECT
        COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
        COALESCE(SUM(cost_usd), 0)::float AS cost
      FROM token_usage
    `;

    // Top users by token usage
    const topUsers = await client`
      SELECT
        u.id, u.email, u.name, u.plan,
        COALESCE(SUM(t.total_tokens), 0)::bigint AS total_tokens,
        COALESCE(SUM(t.cost_usd), 0)::float AS total_cost,
        COUNT(DISTINCT p.id)::int AS project_count
      FROM users u
      LEFT JOIN token_usage t ON t.user_id = u.id
      LEFT JOIN projects p ON p.user_id = u.id
      GROUP BY u.id, u.email, u.name, u.plan
      ORDER BY total_tokens DESC
      LIMIT 10
    `;

    return c.json({
      users: userStats,
      projects: { total: projectStats.total_projects },
      tokens: {
        daily: { tokens: Number(dailyTokens.tokens), cost: dailyTokens.cost },
        monthly: { tokens: Number(monthlyTokens.tokens), cost: monthlyTokens.cost },
        allTime: { tokens: Number(allTimeTokens.tokens), cost: allTimeTokens.cost },
      },
      topUsers,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return c.json({ error: '통계 조회 실패', detail: error?.message }, 500);
  }
});

// ─── GET /api/admin/stats/tokens — 토큰 사용량 상세 ───────────────────
admin.get('/stats/tokens', async (c) => {
  try {
    const period = c.req.query('period') || 'daily'; // daily | monthly
    const days = parseInt(c.req.query('days') || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily breakdown
    let timeBreakdown;
    if (period === 'monthly') {
      timeBreakdown = await client`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS period,
          COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
          COALESCE(SUM(input_tokens), 0)::bigint AS input_tokens,
          COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens,
          COALESCE(SUM(cost_usd), 0)::float AS cost,
          COUNT(*)::int AS request_count
        FROM token_usage
        WHERE created_at >= ${startDate.toISOString()}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY period DESC
      `;
    } else {
      timeBreakdown = await client`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM-DD') AS period,
          COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
          COALESCE(SUM(input_tokens), 0)::bigint AS input_tokens,
          COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens,
          COALESCE(SUM(cost_usd), 0)::float AS cost,
          COUNT(*)::int AS request_count
        FROM token_usage
        WHERE created_at >= ${startDate.toISOString()}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY period DESC
      `;
    }

    // Per-user breakdown
    const perUser = await client`
      SELECT
        u.id, u.email, u.name, u.plan,
        COALESCE(SUM(t.total_tokens), 0)::bigint AS tokens,
        COALESCE(SUM(t.input_tokens), 0)::bigint AS input_tokens,
        COALESCE(SUM(t.output_tokens), 0)::bigint AS output_tokens,
        COALESCE(SUM(t.cost_usd), 0)::float AS cost,
        COUNT(t.id)::int AS request_count
      FROM users u
      LEFT JOIN token_usage t ON t.user_id = u.id AND t.created_at >= ${startDate.toISOString()}
      GROUP BY u.id, u.email, u.name, u.plan
      HAVING SUM(t.total_tokens) > 0
      ORDER BY tokens DESC
    `;

    // Per-model breakdown
    const perModel = await client`
      SELECT
        model,
        COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
        COALESCE(SUM(input_tokens), 0)::bigint AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens,
        COALESCE(SUM(cost_usd), 0)::float AS cost,
        COUNT(*)::int AS request_count
      FROM token_usage
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY model
      ORDER BY tokens DESC
    `;

    return c.json({
      period,
      days,
      timeBreakdown,
      perUser,
      perModel,
    });
  } catch (error: any) {
    console.error('Admin token stats error:', error);
    return c.json({ error: '토큰 통계 조회 실패', detail: error?.message }, 500);
  }
});

export default admin;
