/**
 * Projects Routes
 */

import { Hono } from 'hono';
import { db } from '../db/index.js';
import { projects, documents } from '../db/schema-pg.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import { maskSensitiveData } from '../utils/data-masking.js';

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
  const user = c.get('user');
  
  try {
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.createdAt));

    return c.json({
      projects: userProjects.map(p => ({
        id: p.id,
        title: p.title,
        idea: p.idea.slice(0, 100) + '...',
        status: p.status,
        model: p.model,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    });

  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 프로젝트 생성
projectsRouter.post('/', async (c) => {
  const user = c.get('user');
  
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

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: '입력 값이 유효하지 않습니다', 
        details: error.errors 
      }, 400);
    }

    console.error('프로젝트 생성 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 프로젝트 상세 조회
projectsRouter.get('/:id', async (c) => {
  const user = c.get('user');
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

  } catch (error) {
    console.error('프로젝트 조회 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 프로젝트 수정
projectsRouter.patch('/:id', async (c) => {
  const user = c.get('user');
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

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: '입력 값이 유효하지 않습니다', 
        details: error.errors 
      }, 400);
    }

    console.error('프로젝트 수정 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 프로젝트 삭제
projectsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
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

    // 삭제 (문서는 CASCADE로 자동 삭제)
    await db
      .delete(projects)
      .where(eq(projects.id, projectId));

    return c.json({
      message: '프로젝트가 삭제되었습니다'
    });

  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

export default projectsRouter;
