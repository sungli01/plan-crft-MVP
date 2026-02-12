/**
 * Writer Agent (작성자 에이전트)
 *
 * v4.0: 카테고리별 맞춤 프롬프트, 두괄식 작성, 구체적 데이터 필수
 */

import Anthropic from '@anthropic-ai/sdk';

export interface WriterConfig {
  model?: string;
  name?: string;
}

export interface SectionInfo {
  id?: string;
  title: string;
  level?: number;
  estimatedWords?: number;
  requirements?: string[];
  importance?: string;
  model?: string;
  maxTokens?: number;
}

export interface WriteContext {
  prevTitle?: string | null;
  nextTitle?: string | null;
}

export interface WriteSectionResult {
  sectionId: string;
  content: string;
  wordCount: number;
  tokens: any;
  duration: number;
  generatedAt: string;
}

const CATEGORY_PROMPTS: Record<string, string> = {
  'business-plan': `당신은 사업계획서 작성 전문가입니다.

■ 문서 특성: 사업계획서는 투자자/심사위원을 설득하는 문서입니다.
■ 필수 어투: "~할 것이다", "~를 목표로 한다", "~로 예상된다" 등 확신 있는 미래지향적 표현
■ 필수 데이터: 시장규모(TAM/SAM/SOM), 매출 전망, BEP 시점, 투자 대비 수익률
■ 표준 구조: 사업개요→시장분석→비즈니스모델→재무계획→팀구성→실행전략→리스크관리
■ 핵심 요소:
  - 시장 규모는 반드시 금액과 성장률(CAGR) 포함
  - 경쟁사 분석은 최소 3개사 비교표 필수
  - 재무계획은 3~5년 매출/비용/손익 테이블 필수
  - SWOT 분석 또는 Porter's 5 Forces 활용`,

  'marketing': `당신은 마케팅 기획서 작성 전문가입니다.

■ 문서 특성: 마케팅 기획서는 실행 가능한 전략과 측정 가능한 KPI를 제시하는 문서입니다.
■ 필수 어투: "타겟 고객은~", "전환율 목표는~", "채널별 예산 배분은~" 등 구체적 실행 표현
■ 필수 데이터: 시장점유율, 고객 세그먼트별 규모, CAC/LTV, 채널별 ROI
■ 표준 구조: 시장현황→타겟분석→포지셔닝→마케팅전략(4P)→실행계획→KPI→예산
■ 핵심 요소:
  - STP(Segmentation/Targeting/Positioning) 분석 필수
  - 4P 또는 7P 마케팅 믹스 구체화
  - 월별/분기별 실행 타임라인 표 필수
  - 채널별 예산 배분표와 예상 ROI`,

  'technical': `당신은 기술 문서 작성 전문가입니다.

■ 문서 특성: 기술 문서는 정확성과 재현 가능성이 핵심인 문서입니다.
■ 필수 어투: "~로 구성된다", "~방식으로 동작한다", "~를 적용한다" 등 객관적 기술 표현
■ 필수 데이터: 기술 사양(성능, 용량, 응답시간), 시스템 요구사항, 버전 정보
■ 표준 구조: 기술개요→시스템아키텍처→핵심기술→개발계획→테스트전략→운영계획
■ 핵심 요소:
  - 시스템 아키텍처 구성도(컴포넌트, 데이터 흐름) 설명 필수
  - 기술 스택 버전 명시 (예: Node.js 20.x, PostgreSQL 16)
  - 성능 요구사항 테이블 (TPS, 응답시간, 가용성 등)
  - API 명세 또는 인터페이스 정의 포함`,

  'development': `당신은 개발 계획서 작성 전문가입니다.

■ 문서 특성: 개발 계획서는 구현 일정과 품질 기준을 명확히 하는 문서입니다.
■ 필수 어투: "~단계에서 구현한다", "~까지 완료한다", "~으로 검증한다" 등 실행 중심 표현
■ 필수 데이터: 개발 일정(간트차트), 인력 투입 계획, 테스트 커버리지 목표
■ 표준 구조: 프로젝트개요→요구사항→설계→개발방법론→일정→품질관리→인력
■ 핵심 요소:
  - WBS(Work Breakdown Structure) 기반 일정표 필수
  - 스프린트/이터레이션 계획 테이블
  - 인력별 역할과 투입 M/M 표
  - 품질 지표(코드 커버리지, 버그 밀도 등) 목표치`,

  'investment': `당신은 투자 제안서 작성 전문가입니다.

■ 문서 특성: 투자 제안서는 투자자의 의사결정을 돕는 핵심 문서입니다.
■ 필수 어투: "투자 수익률은~", "Exit 전략은~", "밸류에이션은~" 등 투자자 관점 표현
■ 필수 데이터: 밸류에이션, IRR/ROI, Exit 시나리오, 자금 사용처 breakdown
■ 표준 구조: 투자요약→시장기회→제품/서비스→비즈니스모델→재무전망→팀→투자조건
■ 핵심 요소:
  - Executive Summary 1페이지 핵심 요약 필수
  - 3~5년 재무 전망 테이블 (매출, EBITDA, 순이익)
  - 자금 사용처 파이차트/테이블
  - 투자 라운드별 마일스톤과 KPI`,

  'research': `당신은 연구 보고서 작성 전문가입니다.

■ 문서 특성: 연구 보고서는 학술적 엄밀성과 논리적 근거가 핵심인 문서입니다.
■ 필수 어투: "~로 분석되었다", "~와 상관관계를 보인다", "~로 검증하였다" 등 학술적 표현
■ 필수 데이터: 연구 방법론, 표본 크기, 통계적 유의성, 선행연구 인용
■ 표준 구조: 연구배경→선행연구→연구방법→결과분석→고찰→결론→참고문헌
■ 핵심 요소:
  - 선행연구 비교표 (저자, 연도, 주요 발견, 한계점)
  - 연구 방법론 상세 기술 (표본, 도구, 절차)
  - 결과 데이터 테이블과 해석
  - 한계점과 향후 연구 방향 명시`,

  'public-project': `당신은 공공사업 계획서 작성 전문가입니다.

■ 문서 특성: 공공사업 계획서는 공익성과 정책 부합성을 입증하는 문서입니다.
■ 필수 어투: "~의 필요성이 대두되고 있다", "~에 기여할 것으로 기대된다" 등 공공 정책 표현
■ 필수 데이터: 수혜 대상 규모, 예산 내역, 비용편익(B/C) 분석, 성과지표(KPI)
■ 표준 구조: 사업필요성→현황분석→사업내용→추진체계→예산→기대효과→지속가능성
■ 핵심 요소:
  - 관련 법령/정책 근거 명시
  - 유사사업 사례 비교표
  - 연차별 예산 투입 계획표
  - 정량적/정성적 기대효과와 성과지표`,
};

const BASE_WRITING_RULES = `
■ 작성 원칙 (모든 카테고리 공통):

1. **두괄식 작성 (가장 중요!)**: 
   - 각 섹션의 **첫 문장**에 반드시 핵심 결론/메시지를 배치
   - 이후 근거→세부사항→데이터 순서로 전개
   - 나쁜 예: "최근 시장 환경 변화에 따라... (장황한 배경) ...따라서 A가 필요하다"
   - 좋은 예: "본 사업의 핵심 전략은 AI 기반 자동화로, 연간 **30%** 비용 절감을 달성한다. 그 근거는 다음과 같다."

2. **구체적 수치 필수**: 모든 주장에 숫자 근거 제시 (3개 이상)
   - 나쁜 예: "시장이 빠르게 성장하고 있다"
   - 좋은 예: "국내 시장 규모는 2025년 기준 **3.2조원**이며, 연평균 **12.5%** 성장 중이다"

3. **Markdown 표 필수**: 각 섹션에 최소 1개 이상의 실질적 데이터 표 포함
   - 비교 분석, 일정, 예산, 성과지표, 스펙 정리 등
   - 장식용 빈 표 금지 — 반드시 의미 있는 데이터가 있어야 함

4. **시나리오/사례 중심**: 추상적 설명 대신 구체적 활용 시나리오 제시
   - "이 기술을 활용하면 효율이 높아진다" → "A사 물류센터에 적용 시 배송 시간이 기존 48시간에서 24시간으로 단축된다"

5. **계층 구조**: ## 제목 → ### 소제목 → 1. → 가. → 1) 순서 준수

6. **간결한 문장**: 한 문장 50자 이내 권장, 불필요한 수식어 제거

7. **볼드 강조**: 핵심 수치, 키워드, 결론에 **볼드** 처리 (섹션당 5개 이상)

8. **공문서 숫자 표기**:
   - 날짜: 2026. 2. 11.
   - 금액: 금1,500,000원(금일백오십만원)
   - 시간: 14:30 (24시간제)

9. **반복 금지**: 동일 표현/문구를 다른 섹션에서 재사용하지 않음

10. **주제 충실**: 섹션 제목과 정확히 일치하는 내용만 작성, 벗어나지 않음

11. **FAQ 섹션**: 섹션 제목에 "FAQ" 또는 "자주 묻는 질문"이 포함된 경우:
    - Q&A 형식으로 5개 이상의 예상 질문과 답변 작성
    - 실무자 관점의 구체적 질문 (예: "도입 비용은?", "기존 시스템과 호환되나?")

12. **참고 자료 섹션**: 섹션 제목에 "참고" 또는 "출처"가 포함된 경우:
    - 관련 보고서, 논문, 통계 출처를 구체적으로 기재
    - 형식: 저자 (연도). 제목. 출판처. URL (있는 경우)

출력: Markdown 형식으로 작성`;

export class WriterAgent {
  anthropic: Anthropic;
  model: string;
  name: string;
  role: string;

  constructor(apiKey: string, config: WriterConfig = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.name = config.name || 'Writer';
    this.role = '내용 작성자';
  }

  getSystemPrompt(categoryId?: string): string {
    const categoryPrompt = categoryId && CATEGORY_PROMPTS[categoryId]
      ? CATEGORY_PROMPTS[categoryId]
      : `당신은 전문 문서 작성 전문가입니다. 정확하고 구체적인 데이터를 기반으로 설득력 있는 문서를 작성합니다.`;

    return `${categoryPrompt}\n${BASE_WRITING_RULES}`;
  }

  async writeSection(section: SectionInfo, projectInfo: { title: string; idea?: string; categoryId?: string }, context: WriteContext = {}): Promise<WriteSectionResult> {
    console.log(`\n✍️  [${this.name}] 섹션 작성 중: ${section.title}`);

    const ideaSummary = projectInfo.idea && projectInfo.idea.length > 200
      ? projectInfo.idea.slice(0, 200) + '…'
      : (projectInfo.idea || '');

    let contextLine = '';
    if (context.prevTitle || context.nextTitle) {
      const parts: string[] = [];
      if (context.prevTitle) parts.push(`이전: ${context.prevTitle}`);
      if (context.nextTitle) parts.push(`다음: ${context.nextTitle}`);
      contextLine = `\n흐름: ${parts.join(' → ')}`;
    }

    const userPrompt = `섹션: ${section.title}
과제: ${projectInfo.title}
개요: ${ideaSummary}${contextLine}
${section.requirements ? `핵심 포함 내용: ${section.requirements.join(', ')}` : ''}
${section.estimatedWords ? `목표 분량: ${section.estimatedWords}자 이상 (충실하게 작성)` : ''}

⚠️ 필수 체크리스트:
- [ ] 결론/핵심 메시지를 첫 문단에 배치했는가?
- [ ] 구체적 수치(금액, %, 기간 등)를 3개 이상 포함했는가?
- [ ] Markdown 표를 1개 이상 포함했는가?
- [ ] 섹션 제목과 내용이 정확히 일치하는가?
- [ ] 볼드(**) 강조를 5개 이상 사용했는가?`;

    const model = section.model || this.model;
    const maxTokens = section.maxTokens || 3000;

    try {
      const startTime = Date.now();

      const message = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.5,
        system: this.getSystemPrompt(projectInfo.categoryId),
        messages: [{ role: 'user', content: userPrompt }]
      });

      const content = (message.content[0] as any).text;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const wordCount = content.split(/\s+/).length;

      console.log(`   ✅ 완료 (${duration}초, ${wordCount}단어)`);

      return {
        sectionId: section.id || section.title,
        content,
        wordCount,
        tokens: message.usage,
        duration: parseFloat(duration),
        generatedAt: new Date().toISOString()
      };

    } catch (error: any) {
      console.error(`   ❌ 오류: ${error.message}`);
      throw error;
    }
  }

  async writeMultipleSections(sections: SectionInfo[], projectInfo: { title: string; idea?: string; categoryId?: string }, options: { context?: WriteContext } = {}): Promise<WriteSectionResult[]> {
    console.log(`\n✍️  [${this.name}] ${sections.length}개 섹션 병렬 작성 시작...`);

    const promises = sections.map(section => 
      this.writeSection(section, projectInfo, options.context)
    );

    try {
      const results = await Promise.all(promises);
      console.log(`   ✅ 모든 섹션 작성 완료`);
      return results;

    } catch (error: any) {
      console.error(`   ❌ 병렬 작성 오류: ${error.message}`);
      throw error;
    }
  }

  async improveSection(sectionContent: string, feedback: string, categoryId?: string): Promise<{ content: string; tokens: any }> {
    console.log(`\n✍️  [${this.name}] 섹션 개선 중...`);

    const prompt = `기존:\n${sectionContent}\n\n개선 요청: ${feedback}\n\nMarkdown 출력.`;

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 3000,
      temperature: 0.7,
      system: this.getSystemPrompt(categoryId),
      messages: [{ role: 'user', content: prompt }]
    });

    const improvedContent = (message.content[0] as any).text;
    console.log(`   ✅ 개선 완료`);

    return {
      content: improvedContent,
      tokens: message.usage
    };
  }
}
