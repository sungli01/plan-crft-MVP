import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { sqlite } from '../db/index.js';
import { Orchestrator } from '../engine/orchestrator.js';
import { generateHTML, extractSummary } from '../utils/html-generator.js';

const generate = new Hono();

// POST /api/generate/:projectId - 문서 생성
generate.post('/:projectId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    console.log('[Generate] userId:', userId, 'projectId:', projectId);

    // 프로젝트 존재 및 권한 확인
    const project = sqlite.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    console.log('[Generate] project:', project);

    if (!project) {
      return c.json({ error: 'Project not found', debug: { userId, projectId } }, 404);
    }

    // 프로젝트 상태 업데이트: generating
    sqlite.prepare(
      'UPDATE projects SET status = ?, updated_at = ? WHERE id = ?'
    ).run('generating', Date.now(), projectId);

    // 응답 먼저 보내기 (비동기 처리)
    setTimeout(() => {
      generateDocumentBackground(projectId, project, userId).catch(err => {
        console.error('Background generation error:', err);
      });
    }, 100);

    return c.json({ 
      message: 'Document generation started',
      projectId,
      status: 'generating'
    }, 202);
  } catch (error) {
    console.error('Generate error:', error);
    return c.json({ error: 'Failed to start generation' }, 500);
  }
});

// GET /api/generate/:projectId/status - 생성 상태 확인
generate.get('/:projectId/status', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    // 프로젝트 조회
    const project = sqlite.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // 문서 조회
    const document = sqlite.prepare(
      'SELECT * FROM documents WHERE project_id = ? ORDER BY generated_at DESC LIMIT 1'
    ).get(projectId);

    return c.json({
      projectId,
      status: project.status,
      document: document ? {
        id: document.id,
        qualityScore: document.quality_score,
        sectionCount: document.section_count,
        wordCount: document.word_count,
        imageCount: document.image_count,
        createdAt: document.generated_at
      } : null
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ error: 'Failed to check status' }, 500);
  }
});

// GET /api/generate/:projectId/download - 문서 다운로드
generate.get('/:projectId/download', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    // 프로젝트 권한 확인
    const project = sqlite.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // 문서 조회
    const document = sqlite.prepare(
      'SELECT * FROM documents WHERE project_id = ? ORDER BY generated_at DESC LIMIT 1'
    ).get(projectId);

    if (!document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // HTML 파일로 다운로드
    const filename = `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.html`;
    
    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    return c.body(document.content_html);
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ error: 'Failed to download document' }, 500);
  }
});

// 백그라운드 문서 생성 함수
async function generateDocumentBackground(projectId, projectData, userId) {
  try {
    console.log(`[Background] Starting generation for project ${projectId}`);

    // Orchestrator 설정
    const config = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      architectModel: projectData.model || 'claude-opus-4-20250514',
      writerModel: projectData.model || 'claude-opus-4-20250514',
      curatorModel: 'claude-sonnet-4-20250514',
      reviewerModel: 'claude-sonnet-4-20250514'
    };

    // 프로젝트 정보
    const projectInfo = {
      title: projectData.title,
      idea: projectData.idea
    };

    // Orchestrator로 문서 생성
    const orchestrator = new Orchestrator(config);
    const result = await orchestrator.generateDocument(projectInfo);

    console.log(`[Background] Generation complete for project ${projectId}`);
    console.log(`Quality: ${result.reviews.summary.averageScore}/100, Sections: ${result.sections.length}`);

    // HTML 생성
    const html = generateHTML(result, projectInfo);
    const summary = extractSummary(result);

    // 문서 저장
    const docId = crypto.randomUUID();
    sqlite.prepare(`
      INSERT INTO documents (id, project_id, content_html, quality_score, section_count, word_count, image_count, metadata, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      projectId,
      html,
      summary.qualityScore,
      summary.sectionCount,
      summary.wordCount,
      summary.imageCount,
      JSON.stringify({
        title: projectData.title,
        generatedAt: new Date().toISOString(),
        tokenUsage: summary.tokenUsage
      }),
      Date.now()
    );

    // 토큰 사용량 저장
    const tokenId = crypto.randomUUID();
    sqlite.prepare(`
      INSERT INTO token_usage (id, user_id, project_id, model, input_tokens, output_tokens, total_tokens, cost_usd, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tokenId,
      userId,
      projectId,
      projectData.model || 'claude-opus-4-20250514',
      summary.tokenUsage.input,
      summary.tokenUsage.output,
      summary.tokenUsage.total,
      summary.estimatedCost,
      Date.now()
    );

    // 프로젝트 상태 업데이트: completed
    sqlite.prepare(
      'UPDATE projects SET status = ?, updated_at = ? WHERE id = ?'
    ).run('completed', Date.now(), projectId);

    console.log(`[Background] Project ${projectId} completed successfully`);
  } catch (error) {
    console.error(`[Background] Generation failed for project ${projectId}:`, error);

    // 프로젝트 상태 업데이트: failed
    sqlite.prepare(
      'UPDATE projects SET status = ?, updated_at = ? WHERE id = ?'
    ).run('failed', Date.now(), projectId);
  }
}

export default generate;
