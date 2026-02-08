/**
 * Admin Middleware — Protect admin-only routes
 */

import type { Context, Next } from 'hono';

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user') as any;

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  if (user.role !== 'admin') {
    return c.json({ error: '관리자 권한이 필요합니다' }, 403);
  }

  await next();
}
