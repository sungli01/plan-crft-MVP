/**
 * Agent Team Orchestrator
 * 병렬 에이전트 실행으로 문서 생성 속도 향상
 *
 * Token optimization (v3.1):
 * - ModelRouter: routes each agent/section to optimal model tier
 * - TokenTracker: per-agent cost tracking and optimization reports
 */

import { ArchitectAgent } from './agents/architect';
import type { ProjectInfo } from './agents/architect';
import { WriterAgent } from './agents/writer';
import { ImageCuratorAgent } from './agents/image-curator';
import { ReviewerAgent } from './agents/reviewer';
import { ResearchAgent } from './agents/researcher';
import { PptGeneratorAgent } from './agents/ppt-generator';
import { PdfPresenterAgent } from './agents/pdf-presenter';
import { SlideGeneratorAgent } from './agents/slide-generator';
import type { SlideData } from './agents/slide-generator';
import { ModelRouter } from './model-router';
import { TokenTracker } from './token-tracker';

export interface AgentTeamConfig {
  apiKey: string;
  architectModel?: string;
  writerModel?: string;
  curatorModel?: string;
  reviewerModel?: string;
  unsplashKey?: string;
  openaiKey?: string;
  braveSearchKey?: string;
  proMode?: boolean;
  writerTeamSize?: number;
}

interface TokenUsageMap {
  [key: string]: { input: number; output: number };
}

export interface ProgressTrackerLike {
  updateAgent(projectId: string, agentName: string, data: any): void;
  addLog(projectId: string, log: any): void;
  updatePhase?(projectId: string, phase: string): void;
}

export class AgentTeamOrchestrator {
  config: AgentTeamConfig;
  modelRouter: ModelRouter;
  tokenTracker: TokenTracker;
  architect: ArchitectAgent;
  imageCurator: ImageCuratorAgent;
  reviewer: ReviewerAgent;
  writerTeamSize: number;
  writerTeam: WriterAgent[];
  tokenUsage: TokenUsageMap;
  onProgress: ((phase: string, data: any) => void) | null;

  constructor(config: AgentTeamConfig) {
    this.config = config;
    
    this.modelRouter = new ModelRouter({ proMode: config.proMode || false });
    this.tokenTracker = new TokenTracker();
    
    this.architect = new ArchitectAgent(config.apiKey, {
      model: config.architectModel || this.modelRouter.getArchitectModel()
    });
    this.imageCurator = new ImageCuratorAgent(config.apiKey, { 
      model: config.curatorModel || this.modelRouter.getImageCuratorModel(),
      unsplashKey: config.unsplashKey,
      openaiKey: config.openaiKey,
      braveSearchKey: config.braveSearchKey || process.env.BRAVE_SEARCH_API_KEY
    });
    this.reviewer = new ReviewerAgent(config.apiKey, {
      model: config.reviewerModel || this.modelRouter.getReviewerModel()
    });
    
    this.writerTeamSize = config.writerTeamSize || 3;
    this.writerTeam = [];
    for (let i = 0; i < this.writerTeamSize; i++) {
      this.writerTeam.push(
        new WriterAgent(config.apiKey, { 
          model: config.writerModel || this.modelRouter.defaultModel,
          name: `Writer-${i + 1}`
        })
      );
    }
    
    this.tokenUsage = {
      architect: { input: 0, output: 0 },
      writerTeam: { input: 0, output: 0 },
      imageCurator: { input: 0, output: 0 },
      reviewer: { input: 0, output: 0 }
    };
    
    this.onProgress = null;
    
    console.log(`🔀 ModelRouter: proMode=${this.modelRouter.proMode}`);
    console.log(`   Architect  → ${this.architect.model}`);
    console.log(`   ImageCurator → ${this.imageCurator.model}`);
    console.log(`   Reviewer   → ${this.reviewer.model}`);
    console.log(`   Writer default → ${this.modelRouter.defaultModel}`);
  }

  setProgressCallback(callback: (phase: string, data: any) => void): void {
    this.onProgress = callback;
  }

  updateProgress(phase: string, data: any): void {
    if (this.onProgress) {
      this.onProgress(phase, data);
    }
  }

  updateTokenUsage(agent: string, tokens: any, meta: { model?: string; sectionTitle?: string } = {}): void {
    if (tokens && this.tokenUsage[agent]) {
      this.tokenUsage[agent].input += tokens.input_tokens || 0;
      this.tokenUsage[agent].output += tokens.output_tokens || 0;
    }
    if (tokens) {
      const trackerAgent = agent === 'writerTeam' ? 'writer' : agent;
      this.tokenTracker.recordUsage(trackerAgent as any, {
        input_tokens: tokens.input_tokens || 0,
        output_tokens: tokens.output_tokens || 0,
        model: meta.model || '',
        sectionTitle: meta.sectionTitle || '',
      });
    }
  }

  getTotalTokenUsage(): { input: number; output: number; total: number } {
    let totalInput = 0;
    let totalOutput = 0;
    
    Object.values(this.tokenUsage).forEach(usage => {
      totalInput += usage.input;
      totalOutput += usage.output;
    });
    
    return {
      input: totalInput,
      output: totalOutput,
      total: totalInput + totalOutput
    };
  }

  async generateDocument(projectInfo: ProjectInfo & { projectId?: string; categoryId?: string }, progressTracker: ProgressTrackerLike | null = null): Promise<any> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   Plan-Craft v3.0 - Agent Teams (병렬 처리)             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    const startTime = Date.now();

    try {
      // Phase 0: Deep Research (always enabled)
      let researchResult: any = null;
      {
        console.log('\n🔬 Phase 0: 딥 리서치 (Research Agent)');
        this.updateProgress('researcher', { status: 'running', progress: 10 });

        if (progressTracker && projectInfo.projectId) {
          progressTracker.updateAgent(projectInfo.projectId, 'researcher', {
            status: 'running',
            progress: 10,
            detail: '학술 논문 검색 및 분석 중...'
          });
          progressTracker.addLog(projectInfo.projectId, {
            agent: 'researcher',
            level: 'info',
            message: '딥 리서치 시작 (Semantic Scholar + arXiv)'
          });
        }

        try {
          const researcher = new ResearchAgent({ apiKey: this.config.apiKey });
          researchResult = await researcher.research(
            projectInfo.idea || projectInfo.title || '',
            []
          );

          console.log(`✅ 리서치 완료: ${researchResult.stats.totalPapers}개 논문 발견`);
          console.log(`   Semantic Scholar: ${researchResult.stats.semanticScholar}개`);
          console.log(`   arXiv: ${researchResult.stats.arxiv}개`);
          console.log(`   키워드: ${researchResult.keywords.join(', ')}`);

          this.updateProgress('researcher', { status: 'completed', progress: 100 });

          if (progressTracker && projectInfo.projectId) {
            progressTracker.updateAgent(projectInfo.projectId, 'researcher', {
              status: 'completed',
              progress: 100,
              detail: `${researchResult.stats.totalPapers}개 논문 분석 완료`
            });
            progressTracker.addLog(projectInfo.projectId, {
              agent: 'researcher',
              level: 'success',
              message: `딥 리서치 완료: ${researchResult.stats.totalPapers}개 논문, ${researchResult.references.length}개 참고문헌`
            });
          }
        } catch (researchError: any) {
          console.warn('[ResearchAgent] Research failed (non-fatal):', researchError.message);
          this.updateProgress('researcher', { status: 'skipped', progress: 0 });

          if (progressTracker && projectInfo.projectId) {
            progressTracker.addLog(projectInfo.projectId, {
              agent: 'researcher',
              level: 'warn',
              message: `리서치 건너뜀: ${researchError.message}`
            });
          }
        }
      }

      // Phase 1: 문서 설계 (Architect)
      console.log('\n📐 Phase 1: 문서 설계 (Architect)');
      this.updateProgress('architect', { status: 'running', progress: 10 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'architect', {
          status: 'running',
          progress: 10,
          detail: '문서 구조 설계 중...'
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'architect',
          level: 'info',
          message: '문서 구조 설계 시작'
        });
      }

      // Enrich projectInfo with research context for architect
      const enrichedProjectInfo = { ...projectInfo };
      if (researchResult && researchResult.summary) {
        const researchContext = `\n\n[학술 연구 컨텍스트]\n${researchResult.summary}\n\n[참고 키워드: ${researchResult.keywords.join(', ')}]`;
        enrichedProjectInfo.idea = (enrichedProjectInfo.idea || '') + researchContext;
      }

      const designResult = await this.architect.designStructure(enrichedProjectInfo);
      this.updateTokenUsage('architect', designResult.tokens, { model: this.architect.model });
      
      const design = designResult.design;
      const totalSections = design.structure.reduce((sum, s) => sum + (s.subsections?.length || 0), 0);
      
      console.log(`✅ 설계 완료: ${totalSections}개 섹션`);
      
      this.updateProgress('architect', { status: 'completed', progress: 100 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'architect', {
          status: 'completed',
          progress: 100,
          detail: `${totalSections}개 섹션 구조 완료`
        });
        // Set estimated completion time
        if (progressTracker.setEstimatedTime) {
          progressTracker.setEstimatedTime(projectInfo.projectId, totalSections);
        }
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'architect',
          level: 'success',
          message: `문서 구조 설계 완료: ${totalSections}개 섹션`
        });
      }

      // Phase 1.5: 슬라이드 생성 (Slide Generator — 프레젠테이션 먼저)
      let slideResult: any = null;
      let slideDataArray: SlideData[] = [];
      try {
        console.log('\n🎨 Phase 1.5: 슬라이드 프레젠테이션 생성 (GenSpark 스타일)');
        this.updateProgress('slideGenerator', { status: 'running', progress: 20 });

        if (progressTracker && projectInfo.projectId) {
          progressTracker.updateAgent(projectInfo.projectId, 'slideGenerator', {
            status: 'running', progress: 20,
            detail: '25페이지 프레젠테이션 슬라이드 생성 중...'
          });
          progressTracker.addLog(projectInfo.projectId, {
            agent: 'slideGenerator', level: 'info',
            message: 'GenSpark 스타일 슬라이드 생성 시작'
          });
        }

        const slideGenerator = new SlideGeneratorAgent({
          apiKey: this.config.apiKey,
          model: 'claude-sonnet-4-5-20250929',
          openaiKey: this.config.openaiKey,
          maxDalleImages: 8,
        });

        slideResult = await slideGenerator.generateSlides(
          design,
          researchResult,
          { title: projectInfo.title, idea: projectInfo.idea }
        );
        slideDataArray = slideResult.slides || [];

        const chartSlides = slideDataArray.filter((s: SlideData) => s.chartUrl).length;
        const dalleSlides = slideDataArray.filter((s: SlideData) => s.diagramUrl).length;
        const imgTagSlides = slideDataArray.filter((s: SlideData) => s.chartUrl || s.diagramUrl).length;
        console.log(`✅ 슬라이드 생성 완료: ${slideResult.slideCount}장`);
        console.log(`   📊 Charts: ${chartSlides}개, 🎨 DALL-E: ${dalleSlides}개, 🖼️ Total visuals: ${imgTagSlides}개`);
        this.updateProgress('slideGenerator', { status: 'completed', progress: 100 });

        if (progressTracker && projectInfo.projectId) {
          progressTracker.updateAgent(projectInfo.projectId, 'slideGenerator', {
            status: 'completed', progress: 100,
            detail: `${slideResult.slideCount}장 슬라이드 생성 완료`
          });
          progressTracker.addLog(projectInfo.projectId, {
            agent: 'slideGenerator', level: 'success',
            message: `프레젠테이션 완료: ${slideResult.slideCount}장, 차트 ${slideDataArray.filter((s: SlideData) => s.chartUrl).length}개, DALL-E ${slideDataArray.filter((s: SlideData) => s.diagramUrl).length}개`
          });
        }
      } catch (slideError: any) {
        console.warn('[SlideGenerator] Failed (non-fatal):', slideError.message);
        this.updateProgress('slideGenerator', { status: 'skipped', progress: 0 });
        if (progressTracker && projectInfo.projectId) {
          progressTracker.addLog(projectInfo.projectId, {
            agent: 'slideGenerator', level: 'warn',
            message: `슬라이드 생성 건너뜀: ${slideError.message}`
          });
        }
      }

      // Phase 2: 병렬 작성 (Writer Team)
      console.log(`\n✍️  Phase 2: 병렬 작성 (Writer Team x${this.writerTeamSize})`);
      
      const sections: any[] = [];
      design.structure.forEach(section => {
        section.subsections?.forEach(sub => {
          sections.push({
            id: sub.id || sub.title,
            title: sub.title,
            level: sub.level,
            estimatedWords: sub.estimatedWords || 500,
            requirements: sub.requirements,
            importance: sub.importance || this.modelRouter.classifySection(sub.title),
          });
        });
      });
      
      const sectionCount = sections.length;
      for (let i = 0; i < sectionCount; i++) {
        const s = sections[i];
        s.model = this.modelRouter.getWriterModel(s.title, i, sectionCount);
        const budget = this.modelRouter.getTokenBudget(s.title, i, sectionCount);
        s.maxTokens = budget.maxTokens;
      }
      
      console.log(`📝 총 ${sections.length}개 섹션을 ${this.writerTeamSize}개 팀으로 분산`);
      
      this.updateProgress('writerTeam', { 
        status: 'running', 
        progress: 0,
        totalSections: sections.length,
        completedSections: 0
      });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'writer', {
          status: 'running',
          progress: 0,
          detail: `${this.writerTeamSize}개 팀으로 병렬 작성 시작...`,
          currentSection: 0,
          totalSections: sections.length
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'writer',
          level: 'info',
          message: `병렬 작성 시작: ${this.writerTeamSize}개 Writer 에이전트`
        });
      }

      // Enrich projectInfo with research context for writers
      const writerProjectInfo = { ...projectInfo };
      if (researchResult && researchResult.summary) {
        const researchContext = `\n\n[참고자료]\n${researchResult.summary}\n\n[참고 키워드: ${researchResult.keywords.join(', ')}]`;
        writerProjectInfo.idea = (writerProjectInfo.idea || '') + researchContext;
      }

      let writtenSections = await this.parallelWriteSections(
        sections, 
        writerProjectInfo,
        progressTracker,
        slideDataArray
      );
      
      console.log(`\n✅ 작성 완료: ${writtenSections.length}개 섹션`);
      console.log(`   총 단어 수: ${writtenSections.reduce((sum: number, s: any) => sum + s.wordCount, 0)}`);
      
      this.updateProgress('writerTeam', { status: 'completed', progress: 100 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'writer', {
          status: 'completed',
          progress: 100,
          detail: `${sections.length}개 섹션 작성 완료`
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'writer',
          level: 'success',
          message: `병렬 작성 완료: ${sections.length}개 섹션, ${writtenSections.reduce((sum: number, s: any) => sum + s.wordCount, 0)}단어`
        });
      }

      // Phase 2.5: Use slide result from Phase 1.5
      let pptxBuffer: Buffer | null = null;
      let pptSlideCount = slideResult?.slideCount || 0;
      let pptSlideData: any[] = slideDataArray;
      let presentationHtml: string | null = slideResult?.presentationHtml || null;

      // Phase 3: 이미지 큐레이션 (Image Curator)
      console.log('\n🖼️  Phase 3: 이미지 큐레이션');
      
      this.updateProgress('imageCurator', { status: 'running', progress: 50 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'imageCurator', {
          status: 'running',
          progress: 50,
          detail: '이미지 수집 중...'
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'imageCurator',
          level: 'info',
          message: '이미지 큐레이션 시작'
        });
      }

      // Wrap imageCurator in 120s overall timeout to prevent pipeline stalls
      const IMAGE_CURATOR_TIMEOUT = 120000;
      const imageResults = await Promise.race([
        this.imageCurator.batchCurateImages(
          sections,
          writtenSections.map((s: any) => s.content)
        ),
        new Promise<import('./agents/image-curator').CurationResult[]>((resolve) => {
          setTimeout(() => {
            console.warn(`⏰ [imageCurator] 전체 타임아웃 (${IMAGE_CURATOR_TIMEOUT / 1000}s) — 이미지 없이 진행`);
            resolve(sections.map(s => ({ sectionId: s.id || s.title, images: [] })));
          }, IMAGE_CURATOR_TIMEOUT);
        })
      ]);
      
      imageResults.forEach(result => {
        if (result.totalTokens) {
          this.updateTokenUsage('imageCurator', result.totalTokens, { model: this.imageCurator.model });
        }
      });
      
      const totalImages = imageResults.reduce((sum, r) => sum + r.images.length, 0);
      console.log(`✅ 이미지 큐레이션 완료: ${totalImages}개`);
      
      this.updateProgress('imageCurator', { status: 'completed', progress: 100 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'imageCurator', {
          status: 'completed',
          progress: 100,
          detail: '이미지 큐레이션 완료'
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'imageCurator',
          level: 'success',
          message: `이미지 큐레이션 완료: ${totalImages}개`
        });
      }

      // Phase 4: 품질 검수 + 자동 재작성 (Quality Gate)
      const QUALITY_THRESHOLD = 90;
      const MAX_REWRITE_ROUNDS = 2; // 최대 2회 재시도 (총 3회 작성)
      let reviewRound = 1;
      let bestScore = 0;
      let bestWrittenSections = writtenSections;
      let reviewResult: any;

      const sampleReviewSections = (allSections: any[], allContents: any[]) => {
        const MAX_REVIEW_SECTIONS = 12;
        if (allSections.length <= MAX_REVIEW_SECTIONS) {
          return { reviewSections: allSections, reviewContents: allContents };
        }
        const importantIndices = new Set<number>();
        importantIndices.add(0);
        importantIndices.add(allSections.length - 1);
        allSections.forEach((s: any, i: number) => {
          if (s.importance === 'high' || s.importance === 'critical') importantIndices.add(i);
          if (s.level === 1 || s.level === 2) importantIndices.add(i);
        });
        if (importantIndices.size < MAX_REVIEW_SECTIONS) {
          const step = Math.floor(allSections.length / (MAX_REVIEW_SECTIONS - importantIndices.size));
          for (let i = 0; i < allSections.length && importantIndices.size < MAX_REVIEW_SECTIONS; i += step) {
            importantIndices.add(i);
          }
        }
        const sortedIndices = Array.from(importantIndices).sort((a, b) => a - b).slice(0, MAX_REVIEW_SECTIONS);
        return {
          reviewSections: sortedIndices.map(i => allSections[i]),
          reviewContents: sortedIndices.map(i => allContents[i]?.content || allContents[i] || '')
        };
      };

      // Review-rewrite loop
      while (reviewRound <= MAX_REWRITE_ROUNDS + 1) {
        console.log(`\n✅ Phase 4: 품질 검수 (${reviewRound}차)`);
        
        this.updateProgress('reviewer', { status: 'running', progress: 50 });
        
        if (progressTracker && projectInfo.projectId) {
          progressTracker.updateAgent(projectInfo.projectId, 'reviewer', {
            status: 'running',
            progress: 50,
            detail: `${reviewRound}차 품질 검토 중...`
          });
          progressTracker.addLog(projectInfo.projectId, {
            agent: 'reviewer',
            level: 'info',
            message: `${reviewRound}차 품질 검토 시작`
          });
        }

        const currentContents = writtenSections.map((s: any) => s.content);
        const { reviewSections: rSections, reviewContents: rContents } = sampleReviewSections(sections, currentContents);
        
        console.log(`📋 리뷰: ${rSections.length}개 섹션 검토`);
        
        reviewResult = await this.reviewer.reviewMultipleSections(rSections, rContents);
        
        reviewResult.reviews.forEach((review: any) => {
          if (review.tokens) {
            this.updateTokenUsage('reviewer', review.tokens, { model: this.reviewer.model });
          }
        });
        
        const avgScore = reviewResult.summary.averageScore;
        console.log(`✅ ${reviewRound}차 품질 검수: 평균 ${avgScore.toFixed(1)}/100점`);

        // Track best result
        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestWrittenSections = [...writtenSections];
        }

        if (progressTracker && projectInfo.projectId) {
          progressTracker.addLog(projectInfo.projectId, {
            agent: 'reviewer',
            level: avgScore >= QUALITY_THRESHOLD ? 'success' : 'warn',
            message: `${reviewRound}차 검토: ${avgScore.toFixed(1)}/100점 ${avgScore >= QUALITY_THRESHOLD ? '(통과)' : '(미달)'}`
          });
        }

        // Quality gate passed or max rounds reached
        if (avgScore >= QUALITY_THRESHOLD || reviewRound > MAX_REWRITE_ROUNDS) {
          if (avgScore < QUALITY_THRESHOLD && reviewRound > MAX_REWRITE_ROUNDS) {
            console.log(`⚠️  최대 재시도 횟수 도달. Best score: ${bestScore.toFixed(1)} 사용`);
            writtenSections = bestWrittenSections;
          }
          break;
        }

        // Rewrite: collect feedback from low-scoring sections
        console.log(`\n✍️  ${reviewRound + 1}차 재작성 시작 (피드백 반영)`);
        
        if (progressTracker && projectInfo.projectId) {
          progressTracker.updateAgent(projectInfo.projectId, 'writer', {
            status: 'running',
            progress: 50,
            detail: `${reviewRound + 1}차 재작성 중 (품질 개선)...`
          });
          progressTracker.addLog(projectInfo.projectId, {
            agent: 'writer',
            level: 'info',
            message: `${reviewRound + 1}차 재작성: ${avgScore.toFixed(1)}점 → ${QUALITY_THRESHOLD}점 목표`
          });
        }

        // Find sections that need rewriting (score < 90 or verdict !== 'pass')
        const rewriteIndices: number[] = [];
        const feedbackMap = new Map<number, string>();
        
        reviewResult.reviews.forEach((r: any, reviewIdx: number) => {
          if (r.review.overallScore < QUALITY_THRESHOLD || r.review.verdict !== 'pass') {
            // Find original section index
            const sectionTitle = rSections[reviewIdx]?.title;
            const origIdx = sections.findIndex((s: any) => s.title === sectionTitle);
            if (origIdx >= 0) {
              rewriteIndices.push(origIdx);
              const feedback = [
                ...(r.review.weaknesses || []),
                ...(r.review.improvements || []).map((imp: any) => `${imp.issue}: ${imp.suggestion}`)
              ].join('\n- ');
              feedbackMap.set(origIdx, feedback);
            }
          }
        });

        console.log(`   ${rewriteIndices.length}개 섹션 재작성 필요`);

        // Rewrite low-scoring sections with feedback
        for (const idx of rewriteIndices) {
          const section = sections[idx];
          const feedback = feedbackMap.get(idx) || '';
          const writer = this.writerTeam[idx % this.writerTeamSize];
          
          // Enhance section requirements with reviewer feedback
          const enhancedSection = {
            ...section,
            requirements: `${section.requirements || ''}\n\n[품질 개선 피드백 - 반드시 반영하세요]\n- ${feedback}\n\n[필수 요구사항]\n- 구체적 수치/데이터 3개 이상 포함\n- Markdown 표 1개 이상 포함\n- 볼드체(**) 활용한 강조\n- 전문 용어 사용\n- 각 불릿은 50자 이내 간결하게`
          };

          try {
            const prevTitle = idx > 0 ? sections[idx - 1]?.title : null;
            const nextTitle = idx < sections.length - 1 ? sections[idx + 1]?.title : null;
            const result = await writer.writeSection(enhancedSection, writerProjectInfo, { prevTitle, nextTitle });
            writtenSections[idx] = result;
            this.updateTokenUsage('writerTeam', result.tokens, {
              model: section.model || writer.model,
              sectionTitle: section.title,
            });
            console.log(`   ✓ "${section.title}" 재작성 완료`);
          } catch (rewriteErr: any) {
            console.warn(`   ⚠️  "${section.title}" 재작성 실패: ${rewriteErr.message}`);
          }
        }

        if (progressTracker && projectInfo.projectId) {
          progressTracker.updateAgent(projectInfo.projectId, 'writer', {
            status: 'completed',
            progress: 100,
            detail: `${reviewRound + 1}차 재작성 완료`
          });
        }

        reviewRound++;
      }
      
      this.updateProgress('reviewer', { status: 'completed', progress: 100 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'reviewer', {
          status: 'completed',
          progress: 100,
          detail: `품질 검토 완료 (${reviewRound}차, ${reviewResult.summary.averageScore.toFixed(1)}점)`
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'reviewer',
          level: 'success',
          message: `품질 검토 최종 완료: ${reviewResult.summary.averageScore.toFixed(1)}/100점 (${reviewRound}차 검토)`
        });
      }

      // 최종 결과
      const elapsed = Date.now() - startTime;
      const totalTokens = this.getTotalTokenUsage();
      
      console.log('\n╔═══════════════════════════════════════════════════════════╗');
      console.log('║                  생성 완료 (Agent Teams)                 ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log(`⏱️  소요 시간: ${(elapsed / 1000 / 60).toFixed(1)}분`);
      console.log(`📊 품질 점수: ${reviewResult.summary.averageScore}/100`);
      console.log(`📝 섹션 수: ${writtenSections.length}개`);
      console.log(`📖 총 단어: ${writtenSections.reduce((sum: number, s: any) => sum + s.wordCount, 0).toLocaleString()}개`);
      console.log(`🖼️  이미지: ${totalImages}개`);
      console.log(`💰 토큰 사용: ${totalTokens.total.toLocaleString()} (입력: ${totalTokens.input.toLocaleString()}, 출력: ${totalTokens.output.toLocaleString()})`);
      
      const tokenSummary = this.tokenTracker.getSummary();
      const optimizationReport = this.tokenTracker.getOptimizationReport();
      
      console.log(`\n📊 Token Optimization Report:`);
      console.log(`   총 비용: ${tokenSummary.total.cost}`);
      optimizationReport.suggestions.forEach(s => {
        console.log(`   ${s.type === 'cost_ok' ? '✅' : '⚠️'}  ${s.message}`);
      });
      console.log(`   모델 분포: Opus=${optimizationReport.modelBreakdown.opus}, Sonnet=${optimizationReport.modelBreakdown.sonnet}, Haiku=${optimizationReport.modelBreakdown.haiku}`);
      
      return {
        design,
        sections: writtenSections,
        images: imageResults,
        reviews: reviewResult,
        research: researchResult || null,
        pptxBuffer: pptxBuffer || null,
        pptSlideCount,
        pptSlideData,
        presentationHtml: presentationHtml || null,
        reviewRound,
        metadata: {
          totalTime: elapsed,
          tokenUsage: totalTokens,
          agentTeamSize: this.writerTeamSize,
          tokenSummary,
          optimizationReport,
        }
      };

    } catch (error: any) {
      console.error('문서 생성 실패:', error);
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'system',
          level: 'error',
          message: `오류 발생: ${error.message}`
        });
      }
      
      throw error;
    }
  }

  async parallelWriteSections(sections: any[], projectInfo: ProjectInfo & { projectId?: string }, progressTracker: ProgressTrackerLike | null = null, slideDataArray: SlideData[] = []): Promise<any[]> {
    const results: any[] = [];
    const totalSections = sections.length;
    let completedSections = 0;
    
    const chunks: any[][] = [];
    for (let i = 0; i < sections.length; i += this.writerTeamSize) {
      chunks.push(sections.slice(i, i + this.writerTeamSize));
    }
    
    console.log(`   ${chunks.length}개 라운드로 병렬 처리 (라운드당 최대 ${this.writerTeamSize}개)`);
    
    for (let round = 0; round < chunks.length; round++) {
      const chunk = chunks[round];
      console.log(`\n   라운드 ${round + 1}/${chunks.length}: ${chunk.length}개 섹션 동시 작성`);
      
      const promises = chunk.map((section, idx) => {
        const writer = this.writerTeam[idx];
        const globalIdx = round * this.writerTeamSize + idx;
        const prevTitle = globalIdx > 0 ? sections[globalIdx - 1]?.title : null;
        const nextTitle = globalIdx < sections.length - 1 ? sections[globalIdx + 1]?.title : null;
        
        // Find matching slide for this section
        let slideContext: any = undefined;
        if (slideDataArray.length > 0) {
          // Match by index ratio or title similarity
          const slideIdx = Math.min(Math.floor((globalIdx / sections.length) * slideDataArray.length) + 2, slideDataArray.length - 1);
          const slide = slideDataArray[slideIdx];
          if (slide) {
            slideContext = {
              pageNumber: slide.pageNumber,
              title: slide.title,
              keyMessage: slide.content?.mainText || '',
              bullets: slide.content?.bullets,
              kpiValues: slide.content?.kpiCards?.map(k => `${k.label}: ${k.value}`),
            };
          }
        }
        
        console.log(`      → ${writer.name}: "${section.title}" [${section.model?.split('-').slice(-1)}] max=${section.maxTokens}`);
        return writer.writeSection(section, projectInfo, { prevTitle, nextTitle, slideContext });
      });
      
      const roundResults = await Promise.all(promises);
      
      roundResults.forEach((result, idx) => {
        const section = chunk[idx];
        results.push(result);
        this.updateTokenUsage('writerTeam', result.tokens, {
          model: section.model || this.writerTeam[idx].model,
          sectionTitle: section.title,
        });
        completedSections++;
        
        const progress = Math.round((completedSections / totalSections) * 100);
        
        if (progressTracker && projectInfo.projectId) {
          progressTracker.updateAgent(projectInfo.projectId, 'writer', {
            status: 'running',
            progress: progress,
            detail: `${completedSections}/${totalSections} 섹션 작성 중...`,
            currentSection: completedSections,
            totalSections: totalSections
          });
          
          if (completedSections % 5 === 0 || completedSections === totalSections) {
            progressTracker.addLog(projectInfo.projectId, {
              agent: 'writer',
              level: 'info',
              message: `진행 중: ${completedSections}/${totalSections} 섹션 (${progress}%)`
            });
          }
        }
      });
      
      console.log(`   ✓ 라운드 ${round + 1} 완료 (${completedSections}/${totalSections})`);
      
      if (round < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}
