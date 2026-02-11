/**
 * Projects Routes
 */

import { Hono } from 'hono';
import { db } from '../db/index';
import { projects, documents, mockups, tokenUsage } from '../db/schema-pg';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';
import { maskSensitiveData } from '../utils/data-masking';

const projectsRouter = new Hono();

// 모든 프로젝트 라우트에 인증 필요
projectsRouter.use('/*', authMiddleware);

// Validation schemas
const createProjectSchema = z.object({
  title: z.string().min(5, '제목은 최소 5자 이상이어야 합니다').max(500),
  idea: z.string().min(20, '아이디어는 최소 20자 이상이어야 합니다'),
  model: z.enum(['claude-opus-4', 'claude-sonnet-4', 'gpt-4-turbo']).optional(),
  referenceDoc: z.string().optional()
});

const updateProjectSchema = z.object({
  title: z.string().min(5).max(500).optional(),
  idea: z.string().min(20).optional(),
  model: z.enum(['claude-opus-4', 'claude-sonnet-4', 'gpt-4-turbo']).optional(),
  status: z.enum(['draft', 'generating', 'completed', 'failed']).optional()
});

// 프로젝트 목록 조회
projectsRouter.get('/', async (c) => {
  const user = c.get('user') as any;
  const startTime = Date.now();
  
  try {
    const queryStart = Date.now();
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.createdAt));
    const queryTime = Date.now() - queryStart;

    const mappingStart = Date.now();
    const result = userProjects.map(p => ({
      id: p.id,
      title: p.title,
      idea: p.idea.length > 100 ? p.idea.slice(0, 100) + '...' : p.idea,
      status: p.status,
      model: p.model,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    const mappingTime = Date.now() - mappingStart;
    
    const totalTime = Date.now() - startTime;
    console.log(`[Projects List] User ${user.id}: ${userProjects.length} projects, Query: ${queryTime}ms, Mapping: ${mappingTime}ms, Total: ${totalTime}ms`);

    return c.json({
      projects: result
    });

  } catch (error: any) {
    console.error('프로젝트 목록 조회 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다', detail: error?.message || String(error) }, 500);
  }
});

// 프로젝트 생성
projectsRouter.post('/', async (c) => {
  const user = c.get('user') as any;
  
  try {
    const body = await c.req.json();
    const validated = createProjectSchema.parse(body);

    // 민감정보 마스킹
    const titleMasked = maskSensitiveData(validated.title);
    const ideaMasked = maskSensitiveData(validated.idea);
    const refDocMasked = validated.referenceDoc 
      ? maskSensitiveData(validated.referenceDoc)
      : null;

    // 민감정보 감지 시 로그
    if (titleMasked.hasSensitiveData || ideaMasked.hasSensitiveData) {
      console.warn(`[보안] 프로젝트 생성 시 민감정보 감지 (user: ${user.id})`);
      console.warn(`  - 제목: ${titleMasked.detections.length}건`);
      console.warn(`  - 아이디어: ${ideaMasked.detections.length}건`);
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        userId: user.id,
        title: titleMasked.masked,
        idea: ideaMasked.masked,
        referenceDoc: refDocMasked?.masked || null,
        model: validated.model || 'claude-opus-4',
        status: 'draft'
      })
      .returning();

    return c.json({
      message: '프로젝트가 생성되었습니다',
      project: newProject,
      security: {
        maskedData: titleMasked.hasSensitiveData || ideaMasked.hasSensitiveData,
        detections: [
          ...titleMasked.detections.map(d => ({ field: 'title', type: d.type })),
          ...ideaMasked.detections.map(d => ({ field: 'idea', type: d.type }))
        ]
      }
    }, 201);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: '입력 값이 유효하지 않습니다', 
        details: error.errors 
      }, 400);
    }

    console.error('프로젝트 생성 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다', detail: error?.message || String(error) }, 500);
  }
});

// 프로젝트 상세 조회
projectsRouter.get('/:id', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('id');

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
    }

    if (project.userId !== user.id) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // 문서 정보도 함께 조회
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.generatedAt))
      .limit(1);

    return c.json({
      project: {
        ...project,
        document: document || null
      }
    });

  } catch (error: any) {
    console.error('프로젝트 조회 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다', detail: error?.message || String(error) }, 500);
  }
});

// 프로젝트 수정
projectsRouter.patch('/:id', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('id');

  try {
    const body = await c.req.json();
    const validated = updateProjectSchema.parse(body);

    // 프로젝트 소유권 확인
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
    }

    if (project.userId !== user.id) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // 업데이트
    const [updatedProject] = await db
      .update(projects)
      .set({
        ...validated,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();

    return c.json({
      message: '프로젝트가 수정되었습니다',
      project: updatedProject
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: '입력 값이 유효하지 않습니다', 
        details: error.errors 
      }, 400);
    }

    console.error('프로젝트 수정 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다', detail: error?.message || String(error) }, 500);
  }
});

// 일괄 프로젝트 삭제
projectsRouter.post('/bulk-delete', async (c) => {
  const user = c.get('user') as any;

  try {
    const body = await c.req.json();
    const { projectIds } = body;

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return c.json({ error: '삭제할 프로젝트를 선택해주세요' }, 400);
    }

    console.log(`[Bulk Delete] User ${user.id} deleting ${projectIds.length} projects`);

    let deletedCount = 0;
    const errors: string[] = [];

    for (const projectId of projectIds) {
      try {
        // 프로젝트 소유권 확인
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);

        if (!project) {
          errors.push(`${projectId}: 프로젝트를 찾을 수 없습니다`);
          continue;
        }

        if (project.userId !== user.id) {
          errors.push(`${projectId}: 권한이 없습니다`);
          continue;
        }

        // 연관 레코드 삭제
        await db.delete(documents).where(eq(documents.projectId, projectId));
        await db.delete(mockups).where(eq(mockups.projectId, projectId));
        await db.delete(tokenUsage).where(eq(tokenUsage.projectId, projectId));
        await db.delete(projects).where(eq(projects.id, projectId));

        deletedCount++;
        console.log(`[Bulk Delete] Project ${projectId} deleted`);
      } catch (error: any) {
        console.error(`[Bulk Delete] Error deleting project ${projectId}:`, error);
        errors.push(`${projectId}: ${error.message}`);
      }
    }

    return c.json({
      message: `${deletedCount}개의 프로젝트가 삭제되었습니다`,
      deletedCount,
      totalRequested: projectIds.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('일괄 삭제 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다', detail: error?.message || String(error) }, 500);
  }
});

// 프로젝트 삭제
projectsRouter.delete('/:id', async (c) => {
  const user = c.get('user') as any;
  const projectId = c.req.param('id');

  try {
    // 프로젝트 소유권 확인
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: '프로젝트를 찾을 수 없습니다' }, 404);
    }

    if (project.userId !== user.id) {
      return c.json({ error: '권한이 없습니다' }, 403);
    }

    // 연관 레코드를 수동으로 먼저 삭제 (CASCADE 대신)
    console.log(`[Delete] Deleting project ${projectId} and related records...`);
    
    // 1. Documents 삭제
    await db.delete(documents).where(eq(documents.projectId, projectId));
    console.log(`[Delete] Documents deleted`);
    
    // 2. Mockups 삭제
    await db.delete(mockups).where(eq(mockups.projectId, projectId));
    console.log(`[Delete] Mockups deleted`);
    
    // 3. Token usage 삭제
    await db.delete(tokenUsage).where(eq(tokenUsage.projectId, projectId));
    console.log(`[Delete] Token usage deleted`);
    
    // 4. 프로젝트 삭제
    await db.delete(projects).where(eq(projects.id, projectId));
    console.log(`[Delete] Project deleted successfully`);

    return c.json({
      message: '프로젝트가 삭제되었습니다'
    });

  } catch (error: any) {
    console.error('프로젝트 삭제 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다', detail: error?.message || String(error) }, 500);
  }
});

export default projectsRouter;
