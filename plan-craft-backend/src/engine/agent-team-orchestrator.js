/**
 * Agent Team Orchestrator
 * Claude Opus 4.6 Agent Teams 기능 활용
 * 병렬 에이전트 실행으로 문서 생성 속도 향상
 */

import { ArchitectAgent } from './agents/architect.js';
import { WriterAgent } from './agents/writer.js';
import { ImageCuratorAgent } from './agents/image-curator.js';
import { ReviewerAgent } from './agents/reviewer.js';

export class AgentTeamOrchestrator {
  constructor(config) {
    this.config = config;
    
    // 메인 에이전트
    this.architect = new ArchitectAgent(config.apiKey, { model: config.architectModel });
    this.imageCurator = new ImageCuratorAgent(config.apiKey, { 
      model: config.curatorModel,
      unsplashKey: config.unsplashKey,
      openaiKey: config.openaiKey
    });
    this.reviewer = new ReviewerAgent(config.apiKey, { model: config.reviewerModel });
    
    // Writer 팀 (병렬 실행)
    this.writerTeamSize = config.writerTeamSize || 5;
    this.writerTeam = [];
    for (let i = 0; i < this.writerTeamSize; i++) {
      this.writerTeam.push(
        new WriterAgent(config.apiKey, { 
          model: config.writerModel,
          name: `Writer-${i + 1}`
        })
      );
    }
    
    // 토큰 추적
    this.tokenUsage = {
      architect: { input: 0, output: 0 },
      writerTeam: { input: 0, output: 0 },
      imageCurator: { input: 0, output: 0 },
      reviewer: { input: 0, output: 0 }
    };
    
    // 진행 추적 콜백
    this.onProgress = null;
  }

  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  updateProgress(phase, data) {
    if (this.onProgress) {
      this.onProgress(phase, data);
    }
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

  /**
   * 병렬 문서 생성
   */
  async generateDocument(projectInfo, progressTracker = null) {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   Plan-Craft v3.0 - Agent Teams (병렬 처리)             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    const startTime = Date.now();

    try {
      // ========================================================================
      // Phase 1: 문서 설계 (Architect)
      // ========================================================================
      console.log('\n📐 Phase 1: 문서 설계 (Architect)');
      this.updateProgress('architect', { status: 'running', progress: 10 });
      
      if (progressTracker) {
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

      const designResult = await this.architect.designStructure(projectInfo);
      this.updateTokenUsage('architect', designResult.tokens);
      
      const design = designResult.design;
      const totalSections = design.structure.reduce((sum, s) => sum + (s.subsections?.length || 0), 0);
      
      console.log(`✅ 설계 완료: ${totalSections}개 섹션`);
      
      this.updateProgress('architect', { status: 'completed', progress: 100 });
      
      if (progressTracker) {
        progressTracker.updateAgent(projectInfo.projectId, 'architect', {
          status: 'completed',
          progress: 100,
          detail: `${totalSections}개 섹션 구조 완료`
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'architect',
          level: 'success',
          message: `문서 구조 설계 완료: ${totalSections}개 섹션`
        });
      }

      // ========================================================================
      // Phase 2: 병렬 작성 (Writer Team)
      // ========================================================================
      console.log(`\n✍️  Phase 2: 병렬 작성 (Writer Team x${this.writerTeamSize})`);
      
      // 섹션 목록 생성
      const sections = [];
      design.structure.forEach(section => {
        section.subsections?.forEach(sub => {
          sections.push({
            id: sub.id || sub.title,
            title: sub.title,
            level: sub.level,
            estimatedWords: sub.estimatedWords || 500,
            requirements: sub.requirements
          });
        });
      });
      
      console.log(`📝 총 ${sections.length}개 섹션을 ${this.writerTeamSize}개 팀으로 분산`);
      
      this.updateProgress('writerTeam', { 
        status: 'running', 
        progress: 0,
        totalSections: sections.length,
        completedSections: 0
      });
      
      if (progressTracker) {
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

      // 섹션을 팀별로 분배
      const writtenSections = await this.parallelWriteSections(
        sections, 
        projectInfo,
        progressTracker
      );
      
      console.log(`\n✅ 작성 완료: ${writtenSections.length}개 섹션`);
      console.log(`   총 단어 수: ${writtenSections.reduce((sum, s) => sum + s.wordCount, 0)}`);
      
      this.updateProgress('writerTeam', { status: 'completed', progress: 100 });
      
      if (progressTracker) {
        progressTracker.updateAgent(projectInfo.projectId, 'writer', {
          status: 'completed',
          progress: 100,
          detail: `${sections.length}개 섹션 작성 완료`
        });
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'writer',
          level: 'success',
          message: `병렬 작성 완료: ${sections.length}개 섹션, ${writtenSections.reduce((sum, s) => sum + s.wordCount, 0)}단어`
        });
      }

      // ========================================================================
      // Phase 3: 이미지 큐레이션 (Image Curator)
      // ========================================================================
      console.log('\n🖼️  Phase 3: 이미지 큐레이션');
      
      this.updateProgress('imageCurator', { status: 'running', progress: 50 });
      
      if (progressTracker) {
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
        writtenSections.map(s => s.content)
      );
      
      imageResults.forEach(result => {
        if (result.totalTokens) {
          this.updateTokenUsage('imageCurator', result.totalTokens);
        }
      });
      
      const totalImages = imageResults.reduce((sum, r) => sum + r.images.length, 0);
      console.log(`✅ 이미지 큐레이션 완료: ${totalImages}개`);
      
      this.updateProgress('imageCurator', { status: 'completed', progress: 100 });
      
      if (progressTracker) {
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

      // ========================================================================
      // Phase 4: 품질 검수 (Reviewer)
      // ========================================================================
      console.log('\n✅ Phase 4: 품질 검수');
      
      this.updateProgress('reviewer', { status: 'running', progress: 50 });
      
      if (progressTracker) {
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
        writtenSections.map(s => s.content)
      );
      
      reviewResult.reviews.forEach(review => {
        if (review.tokens) {
          this.updateTokenUsage('reviewer', review.tokens);
        }
      });
      
      console.log(`✅ 품질 검수 완료: 평균 ${reviewResult.summary.averageScore}/100점`);
      
      this.updateProgress('reviewer', { status: 'completed', progress: 100 });
      
      if (progressTracker) {
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

      // ========================================================================
      // 최종 결과
      // ========================================================================
      const elapsed = Date.now() - startTime;
      const totalTokens = this.getTotalTokenUsage();
      
      console.log('\n╔═══════════════════════════════════════════════════════════╗');
      console.log('║                  생성 완료 (Agent Teams)                 ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log(`⏱️  소요 시간: ${(elapsed / 1000 / 60).toFixed(1)}분`);
      console.log(`📊 품질 점수: ${reviewResult.summary.averageScore}/100`);
      console.log(`📝 섹션 수: ${writtenSections.length}개`);
      console.log(`📖 총 단어: ${writtenSections.reduce((sum, s) => sum + s.wordCount, 0).toLocaleString()}개`);
      console.log(`🖼️  이미지: ${totalImages}개`);
      console.log(`💰 토큰 사용: ${totalTokens.total.toLocaleString()} (입력: ${totalTokens.input.toLocaleString()}, 출력: ${totalTokens.output.toLocaleString()})`);
      
      return {
        design,
        sections: writtenSections,
        images: imageResults,
        reviews: reviewResult,
        metadata: {
          totalTime: elapsed,
          tokenUsage: totalTokens,
          agentTeamSize: this.writerTeamSize
        }
      };

    } catch (error) {
      console.error('문서 생성 실패:', error);
      
      if (progressTracker) {
        progressTracker.addLog(projectInfo.projectId, {
          agent: 'system',
          level: 'error',
          message: `오류 발생: ${error.message}`
        });
      }
      
      throw error;
    }
  }

  /**
   * 병렬 섹션 작성
   */
  async parallelWriteSections(sections, projectInfo, progressTracker = null) {
    const results = [];
    const totalSections = sections.length;
    let completedSections = 0;
    
    // 섹션을 청크로 나누기 (팀 크기만큼)
    const chunks = [];
    for (let i = 0; i < sections.length; i += this.writerTeamSize) {
      chunks.push(sections.slice(i, i + this.writerTeamSize));
    }
    
    console.log(`   ${chunks.length}개 라운드로 병렬 처리 (라운드당 최대 ${this.writerTeamSize}개)`);
    
    // 각 청크를 병렬로 처리
    for (let round = 0; round < chunks.length; round++) {
      const chunk = chunks[round];
      console.log(`\n   라운드 ${round + 1}/${chunks.length}: ${chunk.length}개 섹션 동시 작성`);
      
      // 병렬 실행
      const promises = chunk.map((section, idx) => {
        const writer = this.writerTeam[idx];
        console.log(`      → ${writer.name}: "${section.title}"`);
        return writer.writeSection(section, projectInfo);
      });
      
      const roundResults = await Promise.all(promises);
      
      // 결과 수집
      roundResults.forEach((result, idx) => {
        results.push(result);
        this.updateTokenUsage('writerTeam', result.tokens);
        completedSections++;
        
        const progress = Math.round((completedSections / totalSections) * 100);
        
        if (progressTracker) {
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
      
      // Rate limiting (마지막 라운드 제외)
      if (round < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}
