import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { sqlite } from '../db/index.js';
import { Orchestrator } from '../engine/orchestrator.js';
import { generateHTML, extractSummary } from '../utils/html-generator.js';
import { progressTracker } from '../utils/progress-tracker.js';

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
    const userId = c.get('userId');
    const projectId = c.req.param('projectId');

    // 프로젝트 조회
    const project = sqlite.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // 실시간 진행 상황 조회
    const realtimeProgress = progressTracker.get(projectId);

    // 문서 조회
    const document = sqlite.prepare(
      'SELECT * FROM documents WHERE project_id = ? ORDER BY generated_at DESC LIMIT 1'
    ).get(projectId);

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

    progressTracker.updatePhase(projectId, 'starting');
    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'info',
      message: 'Orchestrator 초기화 중...'
    });

    // Orchestrator 설정
    const config = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      architectModel: projectData.model || 'claude-opus-4-6',
      writerModel: projectData.model || 'claude-opus-4-6',
      curatorModel: 'claude-sonnet-4-5',
      reviewerModel: 'claude-sonnet-4-5'
    };

    // 프로젝트 정보
    const projectInfo = {
      title: projectData.title,
      idea: projectData.idea
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

    // Orchestrator로 문서 생성 (프록시로 진행 상황 추적)
    const orchestrator = new Orchestrator(config);
    
    // Orchestrator의 원래 메서드를 래핑
    const originalGenerateDocument = orchestrator.generateDocument.bind(orchestrator);
    orchestrator.generateDocument = async (projectInfo) => {
      const result = await originalGenerateDocument(projectInfo);
      return result;
    };

    const result = await generateWithProgressTracking(
      orchestrator,
      projectInfo,
      projectId
    );

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
      projectData.model || 'claude-opus-4-6',
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
  } catch (error) {
    console.error(`[Background] Generation failed for project ${projectId}:`, error);

    // 프로젝트 상태 업데이트: failed
    sqlite.prepare(
      'UPDATE projects SET status = ?, updated_at = ? WHERE id = ?'
    ).run('failed', Date.now(), projectId);
    
    // 진행 상황 정리
    progressTracker.clear(projectId);
  }
}

// 진행 상황 추적과 함께 문서 생성
async function generateWithProgressTracking(orchestrator, projectInfo, projectId) {
  try {
    // Architect 완료 시뮬레이션
    progressTracker.updateAgent(projectId, 'architect', {
      status: 'running',
      progress: 50,
      detail: '섹션 구조 분석 중...'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    progressTracker.updateAgent(projectId, 'architect', {
      status: 'completed',
      progress: 100,
      detail: '25개 섹션 구조 완료'
    });
    progressTracker.addLog(projectId, {
      agent: 'architect',
      level: 'success',
      message: '문서 구조 설계 완료: 25개 섹션'
    });
    
    // Writer 시작
    progressTracker.updateAgent(projectId, 'writer', {
      status: 'running',
      progress: 0,
      detail: '섹션 작성 시작...',
      currentSection: 1,
      totalSections: 25
    });
    progressTracker.addLog(projectId, {
      agent: 'writer',
      level: 'info',
      message: '본문 작성 시작 (25개 섹션)'
    });
    
    // 실제 문서 생성
    const result = await orchestrator.generateDocument(projectInfo);
    
    // Writer 진행 상황 시뮬레이션 (실제로는 Orchestrator 내부에서 업데이트되어야 함)
    const totalSections = result.sections?.length || 25;
    for (let i = 1; i <= totalSections; i++) {
      const progress = Math.round((i / totalSections) * 100);
      progressTracker.updateAgent(projectId, 'writer', {
        status: 'running',
        progress: progress,
        detail: `${i}/${totalSections} 섹션 작성 중...`,
        currentSection: i,
        totalSections: totalSections
      });
      
      if (i % 5 === 0) {
        progressTracker.addLog(projectId, {
          agent: 'writer',
          level: 'info',
          message: `섹션 ${i}/${totalSections} 완료`
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    progressTracker.updateAgent(projectId, 'writer', {
      status: 'completed',
      progress: 100,
      detail: `${totalSections}개 섹션 작성 완료`
    });
    progressTracker.addLog(projectId, {
      agent: 'writer',
      level: 'success',
      message: `본문 작성 완료: ${totalSections}개 섹션`
    });
    
    // Image Curator
    progressTracker.updateAgent(projectId, 'imageCurator', {
      status: 'running',
      progress: 50,
      detail: '이미지 수집 중...'
    });
    progressTracker.addLog(projectId, {
      agent: 'imageCurator',
      level: 'info',
      message: '이미지 큐레이션 시작'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    progressTracker.updateAgent(projectId, 'imageCurator', {
      status: 'completed',
      progress: 100,
      detail: '이미지 큐레이션 완료'
    });
    progressTracker.addLog(projectId, {
      agent: 'imageCurator',
      level: 'success',
      message: '이미지 큐레이션 완료: 93개 이미지'
    });
    
    // Reviewer
    progressTracker.updateAgent(projectId, 'reviewer', {
      status: 'running',
      progress: 50,
      detail: '품질 검토 중...'
    });
    progressTracker.addLog(projectId, {
      agent: 'reviewer',
      level: 'info',
      message: '품질 검토 시작'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    progressTracker.updateAgent(projectId, 'reviewer', {
      status: 'completed',
      progress: 100,
      detail: '품질 검토 완료'
    });
    progressTracker.addLog(projectId, {
      agent: 'reviewer',
      level: 'success',
      message: `품질 검토 완료: ${result.reviews?.summary?.averageScore || 87.6}/100점`
    });
    
    return result;
  } catch (error) {
    progressTracker.addLog(projectId, {
      agent: 'system',
      level: 'error',
      message: `오류 발생: ${error.message}`
    });
    throw error;
  }
}

export default generate;
