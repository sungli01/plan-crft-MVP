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
      openaiKey: config.openaiKey
    });
    this.reviewer = new ReviewerAgent(config.apiKey, {
      model: config.reviewerModel || this.modelRouter.getReviewerModel()
    });
    
    this.writerTeamSize = config.writerTeamSize || 5;
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

  async generateDocument(projectInfo: ProjectInfo & { projectId?: string }, progressTracker: ProgressTrackerLike | null = null): Promise<any> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   Plan-Craft v3.0 - Agent Teams (병렬 처리)             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    const startTime = Date.now();

    try {
      // Phase 0 (Pro Mode): Deep Research
      let researchResult: any = null;
      if (this.config.proMode) {
        console.log('\n🔬 Phase 0: 딥 리서치 (Research Agent - Pro Mode)');
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

      const writtenSections = await this.parallelWriteSections(
        sections, 
        projectInfo,
        progressTracker
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

      const imageResults = await this.imageCurator.batchCurateImages(
        sections,
        writtenSections.map((s: any) => s.content)
      );
      
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

      // Phase 4: 품질 검수 (Reviewer)
      console.log('\n✅ Phase 4: 품질 검수');
      
      this.updateProgress('reviewer', { status: 'running', progress: 50 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'reviewer', {
          status: 'running',
          progress: 50,
          detail: '품질 검토 중...'
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'reviewer',
          level: 'info',
          message: '품질 검토 시작'
        });
      }

      const reviewResult = await this.reviewer.reviewMultipleSections(
        sections,
        writtenSections.map((s: any) => s.content)
      );
      
      reviewResult.reviews.forEach(review => {
        if (review.tokens) {
          this.updateTokenUsage('reviewer', review.tokens, { model: this.reviewer.model });
        }
      });
      
      console.log(`✅ 품질 검수 완료: 평균 ${reviewResult.summary.averageScore}/100점`);
      
      this.updateProgress('reviewer', { status: 'completed', progress: 100 });
      
      if (progressTracker && projectInfo.projectId) {
        progressTracker.updateAgent(projectInfo.projectId, 'reviewer', {
          status: 'completed',
          progress: 100,
          detail: '품질 검토 완료'
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'reviewer',
          level: 'success',
          message: `품질 검토 완료: ${reviewResult.summary.averageScore}/100점`
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

  async parallelWriteSections(sections: any[], projectInfo: ProjectInfo & { projectId?: string }, progressTracker: ProgressTrackerLike | null = null): Promise<any[]> {
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
        console.log(`      → ${writer.name}: "${section.title}" [${section.model?.split('-').slice(-1)}] max=${section.maxTokens}`);
        return writer.writeSection(section, projectInfo, { prevTitle, nextTitle });
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
