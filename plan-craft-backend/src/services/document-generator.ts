/**
 * Document Generator Service
 * Plan-Craft v3.0 엔진 통합
 */

import { Orchestrator } from '../engine/orchestrator';
import { db } from '../db/index';
import { projects, documents, tokenUsage } from '../db/schema-pg';
import { eq } from 'drizzle-orm';

export class DocumentGeneratorService {
  constructor() {
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  }

  async generateDocument(projectId, userId, options = {}) {
    console.log(`📝 문서 생성 시작: ${projectId}`);

    try {
      // 1. 프로젝트 정보 조회
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다');
      }

      if (project.userId !== userId) {
        throw new Error('권한이 없습니다');
      }

      // 2. 프로젝트 상태 업데이트
      await db
        .update(projects)
        .set({ status: 'generating', updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      // 3. Orchestrator 설정
      const config = {
        apiKey: this.anthropicKey,
        architectModel: options.architectModel || 'claude-opus-4-20250514',
        writerModel: options.writerModel || project.model || 'claude-opus-4-20250514',
        curatorModel: options.curatorModel || 'claude-sonnet-4-20250514',
        reviewerModel: options.reviewerModel || 'claude-sonnet-4-20250514',
        unsplashKey: this.unsplashKey,
        openaiKey: this.openaiKey,
        outputDir: './output',
        progressDir: './progress'
      };

      const orchestrator = new Orchestrator(config);

      // 4. 프로젝트 정보 구성
      const projectInfo = {
        title: project.title,
        idea: project.idea
      };

      console.log('🤖 멀티 에이전트 시스템 시작...');

      // 5. 문서 생성 실행
      const result = await orchestrator.generateDocument(projectInfo);

      console.log('✅ 문서 생성 완료');

      // 6. HTML 생성
      const html = this.generateHTML(result, projectInfo);

      // 7. 문서 저장
      const [savedDocument] = await db
        .insert(documents)
        .values({
          projectId: projectId,
          contentHtml: html,
          qualityScore: result.reviews.summary.averageScore.toString(),
          sectionCount: result.sections.length,
          wordCount: result.sections.reduce((sum, s) => sum + s.wordCount, 0),
          imageCount: result.images.reduce((sum, i) => sum + i.images.length, 0),
          metadata: {
            tokenUsage: result.metadata.tokenUsage,
            totalTokens: result.metadata.totalTokens,
            estimatedCost: result.metadata.estimatedCost,
            totalTime: result.metadata.totalTime,
            design: {
              structure: result.design.structure.length,
              imageRequirements: result.design.imageRequirements?.length || 0
            }
          }
        })
        .returning();

      // 8. 토큰 사용량 기록
      const models = [
        { name: 'architect', model: config.architectModel },
        { name: 'writer', model: config.writerModel },
        { name: 'curator', model: config.curatorModel },
        { name: 'reviewer', model: config.reviewerModel }
      ];

      for (const { name, model } of models) {
        const usage = result.metadata.tokenUsage[name];
        if (usage && (usage.input > 0 || usage.output > 0)) {
          const cost = this.calculateCost(model, usage);
          
          await db.insert(tokenUsage).values({
            userId: userId,
            projectId: projectId,
            model: model,
            inputTokens: usage.input,
            outputTokens: usage.output,
            totalTokens: usage.input + usage.output,
            costUsd: cost.toString()
          });
        }
      }

      // 9. 프로젝트 상태 업데이트
      await db
        .update(projects)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      console.log('💾 문서 저장 완료');

      return {
        success: true,
        document: savedDocument,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('❌ 문서 생성 오류:', error);

      // 프로젝트 상태를 failed로 변경
      await db
        .update(projects)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      throw error;
    }
  }

  calculateCost(model, tokens) {
    const costs = {
      'claude-opus-4-20250514': { input: 0.000015, output: 0.000075 },
      'claude-sonnet-4-20250514': { input: 0.000003, output: 0.000015 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 }
    };

    const cost = costs[model] || costs['claude-opus-4-20250514'];
    return (tokens.input * cost.input) + (tokens.output * cost.output);
  }

  generateHTML(result, projectInfo) {
    const { design, sections, images, reviews, metadata } = result;
    const avgQuality = reviews.summary.averageScore;
    const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
    
    // Build image map: sectionId → images[]
    const imageMap = {};
    if (images && Array.isArray(images)) {
      for (const imgResult of images) {
        if (imgResult.sectionId && imgResult.images && imgResult.images.length > 0) {
          imageMap[imgResult.sectionId] = imgResult.images;
        }
      }
    }
    const totalImageCount = images
      ? images.reduce((sum, r) => sum + (r.images ? r.images.length : 0), 0)
      : 0;

    let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${projectInfo.title} - 사업계획서</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.9;
      color: #222;
      max-width: 210mm;
      margin: 0 auto;
      padding: 30px;
      background: #fff;
    }
    h1 {
      color: #1a1a1a;
      font-size: 28pt;
      font-weight: 700;
      margin: 40px 0 20px 0;
      padding-bottom: 12px;
      border-bottom: 3px solid #2563eb;
    }
    h2 {
      color: #2c3e50;
      font-size: 20pt;
      font-weight: 600;
      margin: 30px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #3b82f6;
    }
    h3 {
      color: #475569;
      font-size: 16pt;
      font-weight: 600;
      margin: 24px 0 12px 0;
      padding-left: 12px;
      border-left: 4px solid #60a5fa;
    }
    p { margin: 10px 0; text-align: justify; line-height: 1.8; }
    ul, ol { margin: 12px 0; padding-left: 30px; }
    li { margin: 8px 0; line-height: 1.7; }
    strong { color: #1e40af; font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 11pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    .cover {
      text-align: center;
      padding: 100px 0;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 36pt;
      color: #1e3a8a;
      border: none;
      margin-bottom: 40px;
    }
    .stats {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      padding: 24px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 5px solid #2563eb;
    }
    .section { margin-bottom: 40px; }
    .page-break { page-break-after: always; }
    figure {
      margin: 28px auto;
      text-align: center;
      max-width: 720px;
    }
    figure img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      display: block;
      margin: 0 auto;
    }
    figcaption {
      margin-top: 10px;
      font-size: 13px;
      color: #6b7280;
      font-style: italic;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${projectInfo.title}</h1>
    <div style="font-size: 20pt; color: #64748b; margin: 20px 0;">
      국가 R&D 과제 사업계획서
    </div>
    <div style="font-size: 18pt; color: #64748b; margin: 20px 0;">
      Plan-Craft (AI 멀티 에이전트 시스템)
    </div>
    <div style="font-size: 16pt; color: #64748b; margin-top: 50px;">
      ${new Date().toLocaleDateString('ko-KR')}
    </div>
    <div class="stats">
      <h3 style="color: #1e40af; margin-bottom: 16px;">📊 문서 정보</h3>
      <p><strong>생성 방식:</strong> 멀티 에이전트 시스템 (4개 AI)</p>
      <p><strong>총 섹션:</strong> ${sections.length}개</p>
      <p><strong>총 단어:</strong> ${totalWords.toLocaleString()}단어</p>
      <p><strong>이미지:</strong> ${totalImageCount}개</p>
      <p><strong>예상 페이지:</strong> 약 ${Math.ceil(totalWords / 500)}페이지</p>
      <p><strong>평균 품질:</strong> ${avgQuality.toFixed(1)}/100점</p>
    </div>
  </div>

  <div class="page-break">
    <h2>프로젝트 개요</h2>
    <p><strong>과제명:</strong> ${projectInfo.title}</p>
    <p><strong>핵심 아이디어:</strong> ${projectInfo.idea}</p>
  </div>

  <div class="page-break">
    <h2>목차</h2>
    <ol>
`;

    sections.forEach((section) => {
      html += `      <li>${section.sectionId} (${section.wordCount}단어)</li>\n`;
    });

    html += `    </ol>
  </div>
`;

    sections.forEach((section) => {
      // Embed images into section content
      const sectionImages = imageMap[section.sectionId] || [];
      let contentWithImages = section.content;
      
      if (sectionImages.length > 0) {
        const imageHtml = sectionImages.map(img => {
          const url = img.url || '';
          const caption = this._escapeHtml(img.caption || img.description || img.alt || '');
          const alt = this._escapeHtml(img.alt || img.caption || '');
          const credit = img.credit
            ? `<span style="display:block;margin-top:4px;font-size:11px;color:#9ca3af;">${this._escapeHtml(img.credit)}</span>`
            : '';
          return `
    <figure>
      <img src="${url}" alt="${alt}" loading="lazy" />
      <figcaption>${caption}${credit}</figcaption>
    </figure>`;
        }).join('\n');
        
        // Insert images before the section content (top position by default)
        contentWithImages = imageHtml + '\n' + section.content;
      }
      
      html += `  <div class="section page-break">
    <h1>${section.sectionId}</h1>
${contentWithImages}
  </div>\n\n`;
    });

    html += `</body>\n</html>`;
    return html;
  }

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
