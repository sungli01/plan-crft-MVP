/**
 * Architect Agent (설계자 에이전트)
 *
 * v4.0: 카테고리별 표준 구조, 섹션 수 최적화 (20-30개), 분량 상향
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ArchitectConfig {
  model?: string;
}

export interface ProjectInfo {
  title: string;
  idea?: string;
  projectId?: string;
  categoryId?: string;
}

export interface DesignSubsection {
  id?: string;
  title: string;
  level: number;
  importance?: string;
  needsImage?: boolean;
  imageType?: string;
  estimatedWords?: number;
  requirements?: string[];
}

export interface DesignSection {
  level: number;
  title: string;
  priority: string;
  subsections?: DesignSubsection[];
}

export interface PresentationPageDesign {
  pageNumber: number;
  title: string;
  keyMessage: string;
  visualType: 'chart' | 'diagram' | 'kpi-cards' | 'icon-grid' | 'timeline' | 'comparison' | 'table' | 'image';
  dataNeeds: string;
  linkedSectionId?: string;
}

export interface DocumentDesign {
  documentTitle: string;
  structure: DesignSection[];
  imageRequirements?: Array<{ sectionId: string; type: string; description: string }>;
  estimatedTotalPages: number;
  presentationStructure?: PresentationPageDesign[];
}

export interface DesignResult {
  design: DocumentDesign;
  tokens: any;
  generatedAt: string;
}

const CATEGORY_STRUCTURES: Record<string, string> = {
  'business-plan': `반드시 다음 표준 구조를 따르세요:
1. 사업 개요 (사업명, 목적, 비전)
2. 시장 분석 (시장규모, 트렌드, 경쟁사 분석)
3. 비즈니스 모델 (수익 구조, 가치 제안)
4. 제품/서비스 (핵심 기능, 차별점)
5. 재무 계획 (매출 전망, 투자 계획, BEP)
6. 팀 구성 (핵심 인력, 조직도)
7. 실행 전략 (단계별 로드맵, 마일스톤)
8. 리스크 관리 (위험 요소, 대응 방안)`,

  'marketing': `반드시 다음 표준 구조를 따르세요:
1. 시장 현황 (시장 규모, 트렌드)
2. 타겟 분석 (고객 세그먼트, 페르소나)
3. 포지셔닝 (경쟁 분석, 차별화 전략)
4. 마케팅 전략 (4P: Product, Price, Place, Promotion)
5. 실행 계획 (채널별 전략, 타임라인)
6. KPI 및 성과 측정 (핵심 지표, 모니터링)
7. 예산 계획 (채널별 예산, ROI 목표)`,

  'technical': `반드시 다음 표준 구조를 따르세요:
1. 기술 개요 (목적, 범위, 기술 스택)
2. 시스템 아키텍처 (구성도, 컴포넌트)
3. 핵심 기술 (알고리즘, 프로토콜, 특허)
4. 데이터 설계 (DB 스키마, 데이터 흐름)
5. 개발 계획 (단계, 일정, 리소스)
6. 테스트 전략 (테스트 계획, 품질 기준)
7. 운영 계획 (배포, 모니터링, 장애 대응)`,

  'development': `반드시 다음 표준 구조를 따르세요:
1. 프로젝트 개요 (배경, 목적, 범위)
2. 요구사항 분석 (기능/비기능 요구사항)
3. 시스템 설계 (아키텍처, 인터페이스)
4. 개발 방법론 (애자일/워터폴, 도구)
5. 개발 일정 (WBS, 마일스톤)
6. 품질 관리 (테스트, 코드 리뷰)
7. 인력 계획 (팀 구성, 역할, M/M)`,

  'investment': `반드시 다음 표준 구조를 따르세요:
1. 투자 요약 (Executive Summary)
2. 시장 기회 (시장 규모, 성장성)
3. 제품/서비스 (핵심 가치, 경쟁력)
4. 비즈니스 모델 (수익 구조, 유닛 이코노믹스)
5. 재무 전망 (3~5년 P&L, Cash Flow)
6. 팀 소개 (경영진, 핵심 인력)
7. 투자 조건 (밸류에이션, 자금 사용처, Exit)`,

  'research': `반드시 다음 표준 구조를 따르세요:
1. 연구 배경 (필요성, 목적)
2. 선행 연구 (문헌 조사, 기존 연구 분석)
3. 연구 방법 (방법론, 도구, 절차)
4. 연구 결과 (데이터 분석, 주요 발견)
5. 고찰 (결과 해석, 시사점)
6. 결론 (요약, 한계점, 향후 연구)
7. 참고문헌`,

  'public-project': `반드시 다음 표준 구조를 따르세요:
1. 사업 필요성 (배경, 법적 근거)
2. 현황 분석 (현재 상태, 문제점)
3. 사업 내용 (추진 내용, 방법)
4. 추진 체계 (조직, 역할, 거버넌스)
5. 예산 계획 (연차별 예산, 재원)
6. 기대 효과 (정량적/정성적)
7. 지속가능성 (사후 관리, 확장성)`,
};

export class ArchitectAgent {
  anthropic: Anthropic;
  model: string;
  name: string;
  role: string;

  constructor(apiKey: string, config: ArchitectConfig = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.name = 'Architect';
    this.role = '문서 설계자';
  }

  getSystemPrompt(categoryId?: string): string {
    const categoryGuide = categoryId && CATEGORY_STRUCTURES[categoryId]
      ? `\n\n■ 카테고리: ${categoryId}\n${CATEGORY_STRUCTURES[categoryId]}`
      : '';

    return `사업계획서 구조 설계 전문가.

■ 핵심 규칙:
- **대섹션 7~10개** (절대 10개 초과 금지)
- **서브섹션 포함 총 20~30개** (절대 30개 초과 금지)
- 각 서브섹션의 estimatedWords: **800~1500** (깊이 있는 내용을 위해)
- 서브섹션이 없는 대섹션도 가능 (대섹션 자체가 하나의 콘텐츠)
- 불필요한 "개요", "요약", "부록" 등 관행적 섹션 제거
- 각 섹션은 고유한 가치를 가져야 함 (내용 중복 금지)
- **마지막 3개 대섹션**은 반드시 "자주 묻는 질문 (FAQ)", "참고 자료", "참고문헌(References)" 포함
  - FAQ: 예상 질문 5개 이상, 서브섹션 없이 단독 대섹션
  - 참고 자료: 관련 보고서/논문/통계 출처 목록, 서브섹션 없이 단독 대섹션
  - 참고문헌(References): 본문에서 인용된 모든 논문/보고서의 정식 서지 정보 목록. 형식: [번호] 저자, 제목, 출처, 년도, URL. 서브섹션 없이 단독 대섹션
${categoryGuide}

순수 JSON만 출력 (마크다운 코드블록 없이).

출력 스키마:
{"documentTitle":"","structure":[{"level":1,"title":"","priority":"high","subsections":[{"level":2,"title":"","importance":"core","needsImage":false,"estimatedWords":1000}]}],"imageRequirements":[],"estimatedTotalPages":40}`;
  }

  async designStructure(projectInfo: ProjectInfo): Promise<DesignResult> {
    console.log(`\n📐 [${this.name}] 문서 구조 설계 시작...`);

    const ideaSummary = projectInfo.idea && projectInfo.idea.length > 200
      ? projectInfo.idea.slice(0, 200) + '…'
      : projectInfo.idea;

    const userPrompt = `과제: ${projectInfo.title}\n아이디어: ${ideaSummary}\n\n⚠️ 대섹션 7~10개, 서브섹션 포함 총 20~30개, estimatedWords는 800~1500으로 설정하세요.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.7,
        system: this.getSystemPrompt(projectInfo.categoryId),
        messages: [{ role: 'user', content: userPrompt }]
      });

      const content = (message.content[0] as any).text;
      
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      } else if (content.includes('```')) {
        jsonStr = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
      }
      
      let design: DocumentDesign;
      try {
        design = JSON.parse(jsonStr);
      } catch (parseErr) {
        const fixed = jsonStr.replace(/,?\s*$/, '') + ']}';
        try { design = JSON.parse(fixed); } catch {
          const fixed2 = jsonStr.replace(/,?\s*$/, '') + '"]}]}';
          design = JSON.parse(fixed2);
        }
      }

      // Post-process: enforce limits
      if (design.structure.length > 10) {
        design.structure = design.structure.slice(0, 10);
      }
      let totalSubs = 0;
      for (const section of design.structure) {
        if (section.subsections) {
          for (const sub of section.subsections) {
            if (!sub.estimatedWords || sub.estimatedWords < 800) {
              sub.estimatedWords = 1000;
            }
          }
          totalSubs += section.subsections.length;
        }
      }
      // If too many subsections, trim from the end
      if (totalSubs > 30) {
        let count = 0;
        for (const section of design.structure) {
          if (section.subsections) {
            const remaining = 30 - count;
            if (section.subsections.length > remaining) {
              section.subsections = section.subsections.slice(0, Math.max(remaining, 1));
            }
            count += section.subsections.length;
          }
        }
      }

      const finalTotal = design.structure.reduce((sum, s) => sum + (s.subsections?.length || 0), 0);
      console.log(`   ✅ 설계 완료`);
      console.log(`   📊 대제목: ${design.structure.length}개, 서브섹션: ${finalTotal}개`);
      console.log(`   🖼️  이미지 필요: ${design.imageRequirements?.length || 0}개`);
      console.log(`   📄 예상 페이지: ${design.estimatedTotalPages}페이지`);

      return {
        design,
        tokens: message.usage,
        generatedAt: new Date().toISOString()
      };

    } catch (error: any) {
      console.error(`   ❌ 오류: ${error.message}`);
      throw error;
    }
  }

  async refineStructure(design: DocumentDesign, feedback: string): Promise<{ design: DocumentDesign; tokens: any }> {
    console.log(`\n📐 [${this.name}] 구조 개선 중...`);

    const prompt = `기존 설계:\n${JSON.stringify(design)}\n\n피드백: ${feedback}\n\n위 피드백 반영하여 개선. 대섹션 7~10개, 총 20~30개 유지. 순수 JSON 출력.`;

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 8000,
      temperature: 0.7,
      system: this.getSystemPrompt(),
      messages: [{ role: 'user', content: prompt }]
    });

    const content = (message.content[0] as any).text;
    let jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
    const refinedDesign: DocumentDesign = JSON.parse(jsonStr);

    console.log(`   ✅ 개선 완료`);

    return {
      design: refinedDesign,
      tokens: message.usage
    };
  }
}
