import { Hono } from 'hono';
import { authMiddleware, verifyToken } from '../middleware/auth';
import { tierCheck } from '../middleware/tier';
import { db } from '../db/index';
import { projects, documents, tokenUsage } from '../db/schema-pg';
import { eq, and, desc } from 'drizzle-orm';
import { AgentTeamOrchestrator } from '../engine/agent-team-orchestrator';
import { generateHTML, extractSummary } from '../utils/html-generator';
import { progressTracker } from '../utils/progress-tracker';

const generate = new Hono();

// POST /api/generate/:projectId - 문서 생성 (tier check applied)
generate.post('/:projectId', authMiddleware, tierCheck(), async (c) => {
  try {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId');

    console.log('[Generate] userId:', userId, 'projectId:', projectId);

    // 프로젝트 존재 및 권한 확인
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);

    console.log('[Generate] project:', project);

    if (!project) {
      return c.json({ error: 'Project not found', debug: { userId, projectId } }, 404);
    }

    // 프로젝트 상태 업데이트: generating
    await db.update(projects).set({ status: 'generating', updatedAt: new Date() }).where(eq(projects.id, projectId));

    // 진행 상황 초기화
    progressTracker.init(projectId);
    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'info',
      message: '프로젝트 생성 시작'
    });

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
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId');

    // 프로젝트 조회
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // 실시간 진행 상황 조회
    const realtimeProgress = progressTracker.get(projectId);

    // 문서 조회
    const [document] = await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.generatedAt)).limit(1);

    return c.json({
      projectId,
      status: project.status,
      progress: realtimeProgress ? {
        phase: realtimeProgress.phase,
        agents: realtimeProgress.agents,
        logs: realtimeProgress.logs.slice(-20), // 최근 20개만
        overallProgress: progressTracker.calculateOverallProgress(projectId),
        startedAt: realtimeProgress.startedAt,
        updatedAt: realtimeProgress.updatedAt
      } : null,
      document: document ? {
        id: document.id,
        qualityScore: document.qualityScore,
        sectionCount: document.sectionCount,
        wordCount: document.wordCount,
        imageCount: document.imageCount,
        createdAt: document.generatedAt
      } : null
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ error: 'Failed to check status' }, 500);
  }
});

// GET /api/generate/:projectId/download/pdf - PDF 다운로드 (print-optimized HTML)
generate.get('/:projectId/download/pdf', async (c) => {
  try {
    // Support both Authorization header and ?token= query param (for new-tab opens)
    let userId: string | undefined;
    const authHeader = c.req.header('Authorization');
    const tokenParam = c.req.query('token');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.substring(7));
      if (payload) userId = payload.userId;
    }
    if (!userId && tokenParam) {
      const payload = verifyToken(tokenParam);
      if (payload) userId = payload.userId;
    }
    if (!userId) {
      return c.json({ error: '인증 토큰이 필요합니다' }, 401);
    }

    const projectId = c.req.param('projectId');

    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
    if (!project) return c.json({ error: 'Project not found' }, 404);

    const [document] = await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.generatedAt)).limit(1);
    if (!document) return c.json({ error: 'Document not found' }, 404);

    // Return HTML with print-optimized styles
    const pdfHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${project.title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20mm; }
      @page { size: A4; margin: 20mm; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.8;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }
    h1 { font-size: 28px; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; color: #1e40af; }
    h2 { font-size: 22px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; color: #1e3a5f; }
    h3 { font-size: 18px; color: #374151; margin-top: 24px; }
    p { margin: 8px 0; text-align: justify; }
    img { max-width: 100%; height: auto; margin: 16px 0; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 14px; }
    th { background: #f3f4f6; font-weight: 600; }
    .cover-page { text-align: center; padding: 60px 0; page-break-after: always; }
    .cover-page h1 { font-size: 36px; border: none; }
    .cover-page .subtitle { color: #6b7280; font-size: 16px; margin-top: 16px; }
    .cover-page .meta { margin-top: 40px; color: #9ca3af; font-size: 14px; }
    .print-btn {
      position: fixed; top: 20px; right: 20px;
      padding: 12px 24px; background: #2563eb; color: white;
      border: none; border-radius: 8px; cursor: pointer; font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">📥 PDF로 저장</button>
  <div class="cover-page">
    <h1>${project.title}</h1>
    <p class="subtitle">${project.idea}</p>
    <p class="meta">
      Plan-Craft AI 사업계획서<br>
      생성일: ${new Date().toLocaleDateString('ko-KR')}<br>
      품질 점수: ${document.qualityScore?.toFixed(1) || 'N/A'}/100 ·
      ${document.sectionCount || 0}개 섹션 ·
      ${document.wordCount?.toLocaleString() || 0} 단어
    </p>
  </div>
  ${document.contentHtml}
</body>
</html>`;

    const filename = `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_사업계획서.html`;

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

    return c.body(pdfHtml);
  } catch (error) {
    console.error('PDF download error:', error);
    return c.json({ error: 'Failed to generate PDF' }, 500);
  }
});

// GET /api/generate/:projectId/download - 문서 다운로드
generate.get('/:projectId/download', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId');

    // 프로젝트 권한 확인
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // 문서 조회
    const [document] = await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.generatedAt)).limit(1);

    if (!document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // HTML 파일로 다운로드
    const filename = `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.html`;
    
    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    return c.body(document.contentHtml!);
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ error: 'Failed to download document' }, 500);
  }
});

// 백그라운드 문서 생성 함수
async function generateDocumentBackground(projectId: string, projectData: any, userId: string) {
  try {
    console.log(`[Background] Starting generation for project ${projectId}`);

    progressTracker.updatePhase(projectId, 'starting');
    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'info',
      message: 'Orchestrator 초기화 중...'
    });

    // 모델명 매핑 (DB 약칭 → Anthropic 실제 모델명)
    const MODEL_MAP: Record<string, string> = {
      'claude-opus-4': 'claude-opus-4-6',
      'claude-sonnet-4': 'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
      'claude-opus-4-20250514': 'claude-opus-4-6',
    };
    const resolveModel = (m?: string) => MODEL_MAP[m || ''] || m || 'claude-opus-4-6';

    // Agent Team Orchestrator 설정
    const config = {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      architectModel: resolveModel(projectData.model),
      writerModel: resolveModel(projectData.model),
      curatorModel: 'claude-sonnet-4-5-20250929',
      reviewerModel: 'claude-sonnet-4-5-20250929',
      writerTeamSize: 5, // 병렬 Writer 에이전트 수
      unsplashKey: process.env.UNSPLASH_ACCESS_KEY,
      openaiKey: process.env.OPENAI_API_KEY
    };

    // 프로젝트 정보
    const projectInfo = {
      title: projectData.title,
      idea: projectData.idea,
      projectId: projectId // 진행 추적용
    };

    // Phase 1: Architect 시작
    progressTracker.updateAgent(projectId, 'architect', {
      status: 'running',
      progress: 10,
      detail: '문서 구조 설계 중...'
    });
    progressTracker.addLog(projectId, {
      agent: 'architect',
      level: 'info',
      message: '문서 구조 설계 시작'
    });

    // Agent Team Orchestrator로 문서 생성 (병렬 처리)
    const orchestrator = new AgentTeamOrchestrator(config);
    
    // 진행 상황 추적과 함께 생성
    const result = await orchestrator.generateDocument(projectInfo, progressTracker);

    console.log(`[Background] Generation complete for project ${projectId}`);
    console.log(`Quality: ${result.reviews.summary.averageScore}/100, Sections: ${result.sections.length}`);

    // HTML 생성
    const html = generateHTML(result, projectInfo);
    const summary = extractSummary(result);

    console.log(`[Background] Saving document to DB...`);
    console.log(`Summary:`, JSON.stringify(summary, null, 2));

    // 문서 저장
    try {
      await db.insert(documents).values({
        projectId: projectId,
        contentHtml: html,
        qualityScore: summary.qualityScore,
        sectionCount: summary.sectionCount,
        wordCount: summary.wordCount,
        imageCount: summary.imageCount,
        metadata: JSON.stringify({
          title: projectData.title,
          generatedAt: new Date().toISOString(),
          tokenUsage: summary.tokenUsage || {}
        }),
        generatedAt: new Date()
      });
      console.log(`✅ Document saved successfully`);
    } catch (err: any) {
      console.error(`❌ Document save failed:`, err.message);
      console.error(`Full error:`, err);
      throw err;
    }

    // 토큰 사용량 저장
    try {
      await db.insert(tokenUsage).values({
        userId: userId,
        projectId: projectId,
        model: projectData.model || 'claude-opus-4-6',
        inputTokens: summary.totalTokens?.input || 0,
        outputTokens: summary.totalTokens?.output || 0,
        totalTokens: summary.totalTokens?.total || 0,
        costUsd: summary.estimatedCost || 0
      });
      console.log(`✅ Token usage saved successfully`);
    } catch (err: any) {
      console.error(`⚠️  Token usage save failed (non-critical):`, err.message);
    }

    // 프로젝트 상태 업데이트: completed
    await db.update(projects).set({ status: 'completed', updatedAt: new Date() }).where(eq(projects.id, projectId));

    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'success',
      message: '문서 생성 완료!'
    });

    console.log(`[Background] Project ${projectId} completed successfully`);
    
    // 1분 후 진행 상황 정리
    setTimeout(() => {
      progressTracker.clear(projectId);
    }, 60000);
  } catch (error: any) {
    console.error(`[Background] Generation failed for project ${projectId}:`, error);

    // 프로젝트 상태 업데이트: failed (with error message)
    await db.update(projects).set({ status: 'failed', errorMessage: error.message, updatedAt: new Date() }).where(eq(projects.id, projectId));
    
    // 진행 상황 정리
    progressTracker.clear(projectId);
  }
}

export default generate;
