/**
 * Mockup API Routes
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { tierCheck } from '../middleware/tier';
import { MockupGeneratorAgent } from '../engine/agents/mockup-generator';
import { db } from '../db/index';
import { projects, mockups } from '../db/schema-pg';
import { eq, and } from 'drizzle-orm';

const mockupRouter = new Hono();

mockupRouter.use('/*', authMiddleware);

// Generate mockup for a project
mockupRouter.post('/:projectId/generate', tierCheck(), async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project || project.userId !== user.id) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
    }

    const { style, colorScheme } = await c.req.json().catch(() => ({}));

    const generator = new MockupGeneratorAgent();
    const result = await generator.generate({
      title: project.title,
      idea: project.idea,
      style: style || 'modern',
      colorScheme,
    });

    // Save mockup to database
    const [saved] = await db
      .insert(mockups)
      .values({
        projectId: project.id,
        userId: user.id,
        html: result.html,
        style: result.metadata.style,
        metadata: JSON.stringify(result.metadata),
      })
      .returning();

    return c.json({
      mockup: result,
      mockupId: saved?.id,
      projectId,
    });
  } catch (e: any) {
    console.error('[Mockup] Generation failed:', e.message);
    return c.json({ error: '목업 생성에 실패했습니다' }, 500);
  }
});

// List mockups for a project
mockupRouter.get('/:projectId', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project || project.userId !== user.id) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
    }

    const projectMockups = await db
      .select()
      .from(mockups)
      .where(eq(mockups.projectId, projectId));

    return c.json({ mockups: projectMockups });
  } catch (e: any) {
    console.error('[Mockup] List failed:', e.message);
    return c.json({ error: '목업 목록 조회에 실패했습니다' }, 500);
  }
});

// Get mockup preview (serves HTML directly)
mockupRouter.get('/:projectId/preview/:mockupId', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');
  const mockupId = c.req.param('mockupId');

  try {
    const [mockup] = await db
      .select()
      .from(mockups)
      .where(
        and(
          eq(mockups.id, mockupId),
          eq(mockups.projectId, projectId),
          eq(mockups.userId, user.id)
        )
      );

    if (!mockup) {
      return c.html(
        '<html><body><h1>목업을 찾을 수 없습니다</h1></body></html>',
        404
      );
    }

    return c.html(mockup.html);
  } catch (e: any) {
    console.error('[Mockup] Preview failed:', e.message);
    return c.html(
      '<html><body><h1>Preview not available</h1></body></html>',
      500
    );
  }
});

export default mockupRouter;
