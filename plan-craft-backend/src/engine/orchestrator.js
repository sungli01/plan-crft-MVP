/**
 * Orchestrator (오케스트레이터)
 * 
 * 역할:
 * - 멀티 에이전트 조율
 * - 작업 스케줄링
 * - 진행 상황 관리
 * - 토큰 추적
 *
 * Token optimization (v3.1):
 * - ModelRouter: per-section model routing
 * - TokenTracker: cost tracking and optimization reports
 */

import { ArchitectAgent } from './agents/architect.js';
import { WriterAgent } from './agents/writer.js';
import { ImageCuratorAgent } from './agents/image-curator.js';
import { ReviewerAgent } from './agents/reviewer.js';
import { ModelRouter } from './model-router.js';
import { TokenTracker } from './token-tracker.js';

export class Orchestrator {
  constructor(config) {
    this.config = config;
    
    // Model router + token tracker
    this.modelRouter = new ModelRouter({ proMode: config.proMode || false });
    this.tokenTracker = new TokenTracker();
    
    // 에이전트 초기화 (models selected by router)
    this.architect = new ArchitectAgent(config.apiKey, {
      model: config.architectModel || this.modelRouter.getArchitectModel()
    });
    this.writer = new WriterAgent(config.apiKey, {
      model: config.writerModel || this.modelRouter.defaultModel
    });
    this.imageCurator = new ImageCuratorAgent(config.apiKey, { 
      model: config.curatorModel || this.modelRouter.getImageCuratorModel(),
      unsplashKey: config.unsplashKey,
      openaiKey: config.openaiKey
    });
    this.reviewer = new ReviewerAgent(config.apiKey, {
      model: config.reviewerModel || this.modelRouter.getReviewerModel()
    });
    
    // 토큰 추적
    this.tokenUsage = {
      architect: { input: 0, output: 0 },
      writer: { input: 0, output: 0 },
      imageCurator: { input: 0, output: 0 },
      reviewer: { input: 0, output: 0 }
    };
    
    // 진행 상황
    this.progress = {
      phase: 'idle',
      currentStep: 0,
      totalSteps: 0,
      percentage: 0
    };
  }

  updateTokenUsage(agent, tokens) {
    if (tokens && this.tokenUsage[agent]) {
      this.tokenUsage[agent].input += tokens.input_tokens || 0;
      this.tokenUsage[agent].output += tokens.output_tokens || 0;
    }
  }

  getTotalTokenUsage() {
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

  calculateCost(model, tokens) {
    return ModelRouter.estimateCost(model, tokens.input || 0, tokens.output || 0);
  }

  updateProgress(phase, step, total) {
    this.progress.phase = phase;
    this.progress.currentStep = step;
    this.progress.totalSteps = total;
    this.progress.percentage = total > 0 ? (step / total * 100).toFixed(1) : 0;
    
    console.log(`\n📊 진행률: ${this.progress.percentage}% (${step}/${total}) - ${phase}`);
  }

  async generateDocument(projectInfo, options = {}) {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         Plan-Craft v3.0 - 멀티 에이전트 시스템          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    const startTime = Date.now();

    try {
      // ========================================================================
      // Phase 1: 문서 설계 (Architect)
      // ========================================================================
      this.updateProgress('설계', 0, 4);
      
      const designResult = await this.architect.designStructure(projectInfo);
      this.updateTokenUsage('architect', designResult.tokens);
      this.tokenTracker.recordUsage('architect', {
        input_tokens: designResult.tokens?.input_tokens || 0,
        output_tokens: designResult.tokens?.output_tokens || 0,
        model: this.architect.model,
      });
      
      const design = designResult.design;
      console.log(`\n✅ Phase 1 완료: 문서 설계`);
      console.log(`   📐 대제목: ${design.structure.length}개`);
      console.log(`   🖼️  이미지: ${design.imageRequirements?.length || 0}개 필요`);

      // ========================================================================
      // Phase 2: 내용 작성 (Writer)
      // ========================================================================
      this.updateProgress('작성', 1, 4);
      
      const sections = [];
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
      
      // Attach model and maxTokens per section via ModelRouter
      const totalSections = sections.length;
      for (let i = 0; i < totalSections; i++) {
        const s = sections[i];
        s.model = this.modelRouter.getWriterModel(s.title, i, totalSections);
        const budget = this.modelRouter.getTokenBudget(s.title, i, totalSections);
        s.maxTokens = budget.maxTokens;
      }
      
      console.log(`\n✍️  Phase 2 시작: ${sections.length}개 섹션 작성`);
      
      const writtenSections = [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const prevTitle = i > 0 ? sections[i - 1].title : null;
        const nextTitle = i < sections.length - 1 ? sections[i + 1].title : null;
        const result = await this.writer.writeSection(section, projectInfo, { prevTitle, nextTitle });
        this.updateTokenUsage('writer', result.tokens);
        this.tokenTracker.recordUsage('writer', {
          input_tokens: result.tokens?.input_tokens || 0,
          output_tokens: result.tokens?.output_tokens || 0,
          model: section.model || this.writer.model,
          sectionTitle: section.title,
        });
        writtenSections.push(result);
        
        this.updateProgress('작성', 1 + (i / sections.length) * 0.5, 4);
        
        // Rate limiting
        if (i < sections.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`\n✅ Phase 2 완료: 내용 작성`);
      console.log(`   ✍️  작성 섹션: ${writtenSections.length}개`);
      console.log(`   📝 총 단어: ${writtenSections.reduce((sum, s) => sum + s.wordCount, 0)}단어`);

      // ========================================================================
      // Phase 3: 이미지 큐레이션 (Image Curator)
      // ========================================================================
      this.updateProgress('이미지 큐레이션', 2, 4);
      
      console.log(`\n🖼️  Phase 3 시작: 이미지 큐레이션`);
      
      const imageResults = await this.imageCurator.batchCurateImages(
        sections,
        writtenSections.map(s => s.content)
      );
      
      imageResults.forEach(result => {
        if (result.totalTokens) {
          this.updateTokenUsage('imageCurator', result.totalTokens);
          this.tokenTracker.recordUsage('imageCurator', {
            input_tokens: result.totalTokens?.input_tokens || 0,
            output_tokens: result.totalTokens?.output_tokens || 0,
            model: this.imageCurator.model,
          });
        }
      });
      
      const totalImages = imageResults.reduce((sum, r) => sum + r.images.length, 0);
      console.log(`\n✅ Phase 3 완료: 이미지 큐레이션`);
      console.log(`   🖼️  이미지: ${totalImages}개`);

      // ========================================================================
      // Phase 4: 품질 검수 (Reviewer)
      // ========================================================================
      this.updateProgress('품질 검수', 3, 4);
      
      console.log(`\n✅ Phase 4 시작: 품질 검수`);
      
      const reviewResult = await this.reviewer.reviewMultipleSections(
        sections,
        writtenSections.map(s => s.content)
      );
      
      reviewResult.reviews.forEach(review => {
        if (review.tokens) {
          this.updateTokenUsage('reviewer', review.tokens);
          this.tokenTracker.recordUsage('reviewer', {
            input_tokens: review.tokens?.input_tokens || 0,
            output_tokens: review.tokens?.output_tokens || 0,
            model: this.reviewer.model,
          });
        }
      });
      
      console.log(`\n✅ Phase 4 완료: 품질 검수`);
      console.log(`   📊 평균 점수: ${reviewResult.summary.averageScore.toFixed(1)}/100`);
      console.log(`   ✔️  통과율: ${reviewResult.summary.passRate}%`);

      // ========================================================================
      // 최종 문서 조합
      // ========================================================================
      this.updateProgress('문서 생성', 4, 4);
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const totalTokens = this.getTotalTokenUsage();
      // Token optimization report
      const tokenSummary = this.tokenTracker.getSummary();
      const optimizationReport = this.tokenTracker.getOptimizationReport();
      const totalCost = this.tokenTracker.usage.total.cost;

      console.log('\n╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ 문서 생성 완료!                                       ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');
      console.log(`⏱️  소요 시간: ${totalTime}초`);
      console.log(`📊 토큰 사용:`);
      console.log(`   - Architect: ${this.tokenUsage.architect.input + this.tokenUsage.architect.output} tokens`);
      console.log(`   - Writer: ${this.tokenUsage.writer.input + this.tokenUsage.writer.output} tokens`);
      console.log(`   - Image Curator: ${this.tokenUsage.imageCurator.input + this.tokenUsage.imageCurator.output} tokens`);
      console.log(`   - Reviewer: ${this.tokenUsage.reviewer.input + this.tokenUsage.reviewer.output} tokens`);
      console.log(`   - 총합: ${totalTokens.total} tokens`);
      console.log(`💰 예상 비용: $${totalCost.toFixed(4)}`);
      
      console.log(`\n📊 Token Optimization Report:`);
      console.log(`   총 비용: ${tokenSummary.total.cost}`);
      optimizationReport.suggestions.forEach(s => {
        console.log(`   ${s.type === 'cost_ok' ? '✅' : '⚠️'}  ${s.message}`);
      });

      return {
        design,
        sections: writtenSections,
        images: imageResults,
        reviews: reviewResult,
        metadata: {
          totalTime,
          tokenUsage: this.tokenUsage,
          totalTokens,
          estimatedCost: totalCost,
          tokenSummary,
          optimizationReport,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('\n❌ 문서 생성 오류:', error.message);
      throw error;
    }
  }
}
