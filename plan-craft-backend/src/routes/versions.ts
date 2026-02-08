import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { db } from '../db/index';
import { documents, projects } from '../db/schema-pg';
import { eq, desc } from 'drizzle-orm';

const versionsRouter = new Hono();
versionsRouter.use('/*', authMiddleware);

// List versions for a project
versionsRouter.get('/:projectId', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');
  
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== user.id) {
    return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
  }
  
  const versions = await db
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .orderBy(desc(documents.createdAt));
  
  return c.json({
    versions: versions.map((v, i) => ({
      id: v.id,
      version: versions.length - i,
      createdAt: v.createdAt,
      qualityScore: v.qualityScore,
      wordCount: v.wordCount,
      sectionCount: v.sectionCount,
    })),
  });
});

// Get specific version
versionsRouter.get('/:projectId/:versionId', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');
  const versionId = c.req.param('versionId');
  
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== user.id) {
    return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
  }
  
  const [doc] = await db.select().from(documents).where(eq(documents.id, versionId));
  if (!doc) return c.json({ error: '버전을 찾을 수 없습니다' }, 404);
  
  return c.json({ version: doc });
});

// Restore a version (creates a new document based on old one)
versionsRouter.post('/:projectId/:versionId/restore', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('projectId');
  const versionId = c.req.param('versionId');
  
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== user.id) {
    return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
  }
  
  const [oldDoc] = await db.select().from(documents).where(eq(documents.id, versionId));
  if (!oldDoc) return c.json({ error: '버전을 찾을 수 없습니다' }, 404);
  
  // Create new document as a copy
  const [restored] = await db.insert(documents).values({
    projectId: oldDoc.projectId,
    contentHtml: oldDoc.contentHtml,
    qualityScore: oldDoc.qualityScore,
    wordCount: oldDoc.wordCount,
    sectionCount: oldDoc.sectionCount,
    imageCount: oldDoc.imageCount,
    metadata: oldDoc.metadata,
  }).returning();
  
  return c.json({ message: '버전이 복원되었습니다', version: restored });
});

export default versionsRouter;
