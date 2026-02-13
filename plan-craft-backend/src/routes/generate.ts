import { Hono } from 'hono';
import { authMiddleware, verifyToken } from '../middleware/auth';
import { tierCheck } from '../middleware/tier';
import { db } from '../db/index';
import { projects, documents, tokenUsage } from '../db/schema-pg';
import { eq, and, desc } from 'drizzle-orm';
import { AgentTeamOrchestrator } from '../engine/agent-team-orchestrator';
import { generateHTML, extractSummary } from '../utils/html-generator';
import { progressTracker } from '../utils/progress-tracker';

// In-memory PPTX buffer cache (projectId → Buffer)
// Cleared after 30 minutes or on download
const pptxCache = new Map<string, { buffer: Buffer; createdAt: number }>();

function cachePptx(projectId: string, buffer: Buffer) {
  pptxCache.set(projectId, { buffer, createdAt: Date.now() });
  // Auto-cleanup after 30 min
  setTimeout(() => pptxCache.delete(projectId), 30 * 60 * 1000);
}

// In-memory presentation HTML cache (projectId → HTML)
const presentationCache = new Map<string, { html: string; createdAt: number }>();

function cachePresentation(projectId: string, html: string) {
  presentationCache.set(projectId, { html, createdAt: Date.now() });
  setTimeout(() => presentationCache.delete(projectId), 60 * 60 * 1000);
}

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

    // 기존 문서 수로 버전 결정
    const existingDocs = await db.select().from(documents).where(eq(documents.projectId, projectId));
    const version = existingDocs.length + 1;

    // 응답 먼저 보내기 (비동기 처리)
    setTimeout(() => {
      generateDocumentBackground(projectId, project, userId, version).catch(err => {
        console.error('Background generation error:', err);
      });
    }, 100);

    return c.json({ 
      message: 'Document generation started',
      projectId,
      version,
      status: 'generating'
    }, 202);
  } catch (error) {
    console.error('Generate error:', error);
    return c.json({ error: 'Failed to start generation' }, 500);
  }
});

// POST /api/generate/:projectId/regenerate - 같은 프로젝트로 새 버전 문서 재생성
generate.post('/:projectId/regenerate', authMiddleware, tierCheck(), async (c) => {
  try {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId');

    console.log('[Regenerate] userId:', userId, 'projectId:', projectId);

    // 프로젝트 존재 및 권한 확인
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // 기존 문서 수를 세서 버전 번호 결정
    const existingDocs = await db.select().from(documents).where(eq(documents.projectId, projectId));
    const nextVersion = existingDocs.length + 1;

    console.log(`[Regenerate] Project "${project.title}" — generating version ${nextVersion}`);

    // 프로젝트 상태 업데이트: generating
    await db.update(projects).set({ status: 'generating', updatedAt: new Date() }).where(eq(projects.id, projectId));

    // 진행 상황 초기화
    progressTracker.init(projectId);
    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'info',
      message: `버전 ${nextVersion} 재생성 시작`
    });

    // 응답 먼저 보내기 (비동기 처리)
    setTimeout(() => {
      generateDocumentBackground(projectId, project, userId, nextVersion).catch(err => {
        console.error('Background regeneration error:', err);
      });
    }, 100);

    return c.json({ 
      message: 'Document regeneration started',
      projectId,
      version: nextVersion,
      status: 'generating'
    }, 202);
  } catch (error) {
    console.error('Regenerate error:', error);
    return c.json({ error: 'Failed to start regeneration' }, 500);
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

    // 문서 조회 (최신)
    const [document] = await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.generatedAt)).limit(1);

    // 전체 문서 수 (버전 수)
    const allDocs = await db.select().from(documents).where(eq(documents.projectId, projectId));
    const totalVersions = allDocs.length;
    const currentVersion = document ? (() => { try { const m = JSON.parse(document.metadata || '{}'); return m.version || 1; } catch { return 1; } })() : 0;

    return c.json({
      projectId,
      status: project.status,
      totalVersions,
      currentVersion,
      progress: realtimeProgress ? {
        phase: realtimeProgress.phase,
        agents: realtimeProgress.agents,
        logs: realtimeProgress.logs.slice(-20), // 최근 20개만
        overallProgress: progressTracker.calculateOverallProgress(projectId),
        startedAt: realtimeProgress.startedAt,
        updatedAt: realtimeProgress.updatedAt,
        estimatedMinutes: realtimeProgress.estimatedMinutes,
        estimatedEndTime: realtimeProgress.estimatedEndTime,
        remainingMinutes: progressTracker.getRemainingTime(projectId)
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

    const docVersion = (() => { try { const m = JSON.parse(document.metadata || '{}'); return m.version || 1; } catch { return 1; } })();
    const versionSuffix = docVersion > 1 ? `_v${docVersion}` : '';
    const filename = `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}${versionSuffix}_사업계획서.html`;

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

    return c.body(pdfHtml);
  } catch (error) {
    console.error('PDF download error:', error);
    return c.json({ error: 'Failed to generate PDF' }, 500);
  }
});

// GET /api/generate/:projectId/download - 문서 다운로드 (optional ?docId= for specific version)
generate.get('/:projectId/download', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const projectId = c.req.param('projectId');
    const docId = c.req.query('docId');

    // 프로젝트 권한 확인
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // 문서 조회 (특정 버전 or 최신)
    let document;
    if (docId) {
      [document] = await db.select().from(documents).where(and(eq(documents.id, docId), eq(documents.projectId, projectId))).limit(1);
    } else {
      [document] = await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.generatedAt)).limit(1);
    }

    if (!document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // HTML 파일로 다운로드
    const docVersion = (() => { try { const m = JSON.parse(document.metadata || '{}'); return m.version || 1; } catch { return 1; } })();
    const versionSuffix = docVersion > 1 ? `_v${docVersion}` : '';
    const filename = `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}${versionSuffix}.html`;
    
    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    return c.body(document.contentHtml!);
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ error: 'Failed to download document' }, 500);
  }
});

// GET /api/generate/:projectId/download-pptx — PPTX 파일 다운로드
generate.get('/:projectId/download-pptx', async (c) => {
  try {
    // Support both Authorization header and ?token= query param
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

    // Check cache first, if not cached try to regenerate from latest doc
    let cached = pptxCache.get(projectId);
    if (!cached) {
      // Try to regenerate PPT from existing document
      try {
        const [latestDocForPpt] = await db.select().from(documents)
          .where(eq(documents.projectId, projectId))
          .orderBy(desc(documents.generatedAt))
          .limit(1);
        
        if (latestDocForPpt?.content) {
          const { PptGeneratorAgent } = await import('../engine/agents/ppt-generator');
          const pptGenerator = new PptGeneratorAgent({
            apiKey: process.env.ANTHROPIC_API_KEY || '',
            model: 'claude-sonnet-4-5-20250929',
          });
          
          // content를 섹션으로 분리
          const contentStr = typeof latestDocForPpt.content === 'string' 
            ? latestDocForPpt.content 
            : JSON.stringify(latestDocForPpt.content);
          
          let sections: any[];
          try {
            const parsed = JSON.parse(contentStr);
            sections = Array.isArray(parsed) ? parsed : (parsed.sections || [parsed]);
          } catch {
            sections = [{ id: 'full', title: project.title, content: contentStr, wordCount: contentStr.length }];
          }
          
          const pptSections = sections.map((s: any, idx: number) => ({
            id: s.id || `section-${idx}`,
            title: s.title || `섹션 ${idx + 1}`,
            content: s.content || s.text || '',
            wordCount: (s.content || s.text || '').length,
          }));
          
          const pptResult = await pptGenerator.generatePptx(pptSections, {
            title: project.title,
            idea: project.idea || '',
          });
          
          cachePptx(projectId, pptResult.buffer);
          cached = pptxCache.get(projectId);
          console.log(`[PPTX] Regenerated for ${projectId}: ${pptResult.slideCount} slides`);
        }
      } catch (regenError: any) {
        console.error('[PPTX] Regeneration failed:', regenError.message);
      }
    }
    
    if (!cached) {
      return c.json({ error: 'PPTX를 생성할 수 없습니다. 문서를 먼저 생성해주세요.' }, 404);
    }

    // Get latest doc version for filename
    const [latestDoc] = await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.generatedAt)).limit(1);
    const pptxVersion = (() => { try { const m = JSON.parse(latestDoc?.metadata || '{}'); return m.version || 1; } catch { return 1; } })();
    const pptxVersionSuffix = pptxVersion > 1 ? `_v${pptxVersion}` : '';
    const filename = `${project.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}${pptxVersionSuffix}_사업계획서.pptx`;

    c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    c.header('Content-Length', String(cached.buffer.length));

    return c.body(cached.buffer);
  } catch (error) {
    console.error('PPTX download error:', error);
    return c.json({ error: 'Failed to download PPTX' }, 500);
  }
});

// GET /api/generate/:projectId/download-presentation — 발표자료 HTML 슬라이드
generate.get('/:projectId/download-presentation', async (c) => {
  try {
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

    // Check cache first
    let cached = presentationCache.get(projectId);
    if (cached) {
      c.header('Content-Type', 'text/html; charset=utf-8');
      return c.body(cached.html);
    }

    // Try to regenerate from latest document
    const [latestDoc] = await db.select().from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.generatedAt))
      .limit(1);

    if (!latestDoc) return c.json({ error: 'Document not found. Generate a document first.' }, 404);

    // Check if presentationHtml is stored in metadata
    try {
      const meta = JSON.parse(latestDoc.metadata || '{}');
      if (meta.presentationHtml) {
        cachePresentation(projectId, meta.presentationHtml);
        c.header('Content-Type', 'text/html; charset=utf-8');
        return c.body(meta.presentationHtml);
      }
    } catch {}

    // Generate on-the-fly
    try {
      const { PdfPresenterAgent } = await import('../engine/agents/pdf-presenter');
      const presenter = new PdfPresenterAgent({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-sonnet-4-5-20250929',
      });

      const contentStr = typeof latestDoc.content === 'string'
        ? latestDoc.content
        : JSON.stringify(latestDoc.content);

      let sections: any[];
      try {
        const parsed = JSON.parse(contentStr);
        sections = Array.isArray(parsed) ? parsed : (parsed.sections || [parsed]);
      } catch {
        sections = [{ id: 'full', title: project.title, content: contentStr }];
      }

      const presenterSections = sections.map((s: any, idx: number) => ({
        id: s.id || `section-${idx}`,
        title: s.title || `섹션 ${idx + 1}`,
        content: s.content || s.text || '',
      }));

      const result = await presenter.generatePresentation(presenterSections, {
        title: project.title,
        idea: project.idea || '',
      });

      cachePresentation(projectId, result.html);
      c.header('Content-Type', 'text/html; charset=utf-8');
      return c.body(result.html);
    } catch (genError: any) {
      console.error('[Presentation] Generation failed:', genError.message);
      return c.json({ error: '발표자료 생성에 실패했습니다.' }, 500);
    }
  } catch (error) {
    console.error('Presentation download error:', error);
    return c.json({ error: 'Failed to generate presentation' }, 500);
  }
});

// GET /api/generate/:projectId/pptx-status — Check if PPTX is available
generate.get('/:projectId/pptx-status', authMiddleware, async (c) => {
  const projectId = c.req.param('projectId');
  const cached = pptxCache.get(projectId);
  if (cached) return c.json({ available: true });
  
  // 캐시 없어도 문서가 있으면 available (다운로드 시 재생성)
  const [doc] = await db.select({ id: documents.id }).from(documents)
    .where(eq(documents.projectId, projectId))
    .orderBy(desc(documents.generatedAt))
    .limit(1);
  return c.json({ available: !!doc });
});

// 백그라운드 문서 생성 함수
async function generateDocumentBackground(projectId: string, projectData: any, userId: string, version?: number) {
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // API 키 검증
    if (!apiKey) {
      const error = new Error('ANTHROPIC_API_KEY is not set in environment variables');
      console.error(`❌ ${error.message}`);
      progressTracker.addLog(projectId, {
        agent: 'system',
        level: 'error',
        message: 'API 키 설정 오류'
      });
      throw error;
    }
    
    console.log(`[Background] API Key exists: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);
    
    const config = {
      apiKey: apiKey,
      architectModel: resolveModel(projectData.model),
      writerModel: resolveModel(projectData.model),
      curatorModel: 'claude-sonnet-4-5-20250929',
      reviewerModel: 'claude-sonnet-4-5-20250929',
      writerTeamSize: 3, // 병렬 Writer 에이전트 수
      unsplashKey: process.env.UNSPLASH_ACCESS_KEY,
      openaiKey: process.env.OPENAI_API_KEY,
      braveSearchKey: process.env.BRAVE_SEARCH_API_KEY
    };
    
    console.log(`[Background] Config prepared:`, {
      architectModel: config.architectModel,
      writerModel: config.writerModel,
      writerTeamSize: config.writerTeamSize
    });

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
    console.log(`[Background] Creating Orchestrator...`);
    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'info',
      message: 'Orchestrator 생성 중...'
    });
    
    let orchestrator: AgentTeamOrchestrator;
    try {
      orchestrator = new AgentTeamOrchestrator(config);
      console.log(`✅ Orchestrator created successfully`);
      progressTracker.addLog(projectId, {
        agent: 'system',
        level: 'success',
        message: 'Orchestrator 생성 완료'
      });
    } catch (orchError: any) {
      console.error(`❌ Orchestrator creation failed:`, orchError);
      progressTracker.addLog(projectId, {
        agent: 'system',
        level: 'error',
        message: `Orchestrator 생성 실패: ${orchError.message}`
      });
      throw orchError;
    }
    
    // 진행 상황 추적과 함께 생성
    console.log(`[Background] Starting document generation...`);
    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'info',
      message: '문서 생성 시작...'
    });
    
    const result = await orchestrator.generateDocument(projectInfo, progressTracker);

    console.log(`[Background] Generation complete for project ${projectId}`);
    console.log(`Quality: ${result.reviews.summary.averageScore}/100, Sections: ${result.sections.length}`);

    // Cache PPTX buffer if available
    if (result.pptxBuffer) {
      cachePptx(projectId, result.pptxBuffer);
      console.log(`[Background] PPTX cached for project ${projectId} (${(result.pptxBuffer.length / 1024).toFixed(0)}KB)`);
    }

    // Cache presentation HTML if available
    if (result.presentationHtml) {
      cachePresentation(projectId, result.presentationHtml);
      console.log(`[Background] Presentation HTML cached for project ${projectId}`);
    }

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
          version: version || 1,
          generatedAt: new Date().toISOString(),
          tokenUsage: summary.tokenUsage || {},
          presentationHtml: result.presentationHtml || null
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
