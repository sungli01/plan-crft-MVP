import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { db } from '../db/index';
import { projects, documents } from '../db/schema-pg';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const sharingRouter = new Hono();

// Create share link (requires auth)
sharingRouter.post('/:projectId/share', authMiddleware, async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');
  const { permission, password, expiresInDays } = await c.req.json().catch(() => ({}));
  
  // Verify project ownership
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== user.id) {
    return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
  }
  
  const shareToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;
  
  // Store share info in project metadata or a shares table
  // For now, we'll use a simple in-memory store + return the token
  // In production, this should be a DB table
  
  return c.json({
    shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${shareToken}`,
    token: shareToken,
    permission: permission || 'view',
    expiresAt,
    projectId,
  });
});

// Access shared document (no auth required)
sharingRouter.get('/view/:shareToken', async (c) => {
  const shareToken = c.req.param('shareToken');
  
  // Look up share token → project
  // For now, return a placeholder
  return c.json({
    error: 'Share token lookup not yet implemented',
    token: shareToken,
  }, 501);
});

export default sharingRouter;
