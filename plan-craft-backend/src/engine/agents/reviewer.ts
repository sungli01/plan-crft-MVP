/**
 * Reviewer Agent (검수자 에이전트)
 * v4.0: 현실적 평가 기준, 가산 방식 채점
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ReviewerConfig {
  model?: string;
}

export interface ReviewScores {
  structure: number;
  style: number;
  content: number;
  emphasis: number;
}

export interface ReviewImprovement {
  issue: string;
  suggestion: string;
  priority: string;
}

export interface SectionReview {
  overallScore: number;
  scores?: ReviewScores;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: ReviewImprovement[];
  needsRewrite?: boolean;
  verdict: string;
  error?: string;
}

export interface ReviewResult {
  sectionId: string;
  review: SectionReview;
  tokens?: any;
  reviewedAt?: string;
  error?: string;
}

export interface ReviewSummary {
  reviews: ReviewResult[];
  summary: {
    averageScore: number;
    passCount: number;
    totalCount: number;
    passRate: string;
  };
}

export interface DocumentReview {
  documentScore: number;
  completeness?: number;
  logicalFlow?: number;
  overallQuality?: number;
  missingElements?: string[];
  redundancies?: string[];
  globalImprovements?: string[];
  readyForDelivery?: boolean;
  error?: string;
}

export class ReviewerAgent {
  anthropic: Anthropic;
  model: string;
  name: string;
  role: string;

  constructor(apiKey: string, config: ReviewerConfig = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.name = 'Reviewer';
    this.role = '품질 검수자';
  }

  async reviewSection(section: { id?: string; title: string }, content: string, criteria: any = {}): Promise<ReviewResult> {
    console.log(`\n✅ [${this.name}] 섹션 검수: ${section.title}`);

    const prompt = `당신은 엄격한 문서 품질 검수 전문가입니다.
기본 점수는 **50점**에서 시작합니다. 각 항목별로 품질에 따라 가산합니다.
관대한 채점은 금물입니다. 실제로 부족한 내용에는 낮은 점수를 부여하세요.

# 검수 대상
제목: ${section.title}

내용:
${content}

# 채점 기준 (가산 방식, 기본 50점 → 최대 100점)

## 1. 구조 (최대 30점) — 기본 0점에서 가산
- 계층 구조(##, ###, 1., 가.)가 명확한가? (+5~10)
- 제목과 내용이 정확히 일치하는가? (+5~10)
  → 주제와 무관한 내용이 있으면 **10점 이하**
- 논리적 흐름(두괄식: 결론→근거→세부)인가? (+5~10)

## 2. 개조식 표현 (최대 25점) — 기본 0점에서 가산
- 번호 매기기/불릿 포인트 적극 활용? (+5~10)
- 각 항목이 간결(50자 이내)하고 명확한가? (+5~10)
- 같은 문구가 반복되지 않는가? (+3~5)
  → 동일/유사 문구 3회 이상 반복 시 **5점 감점**

## 3. 내용 품질 (최대 30점) — 기본 0점에서 가산
- 구체적 수치/데이터가 3개 이상 포함? (+10~15)
  → 구체적 숫자(금액, %, 기간 등)가 전혀 없으면 **15점 이하**
- 전문 용어가 정확히 사용되었는가? (+5~10)
- 해당 주제에 특화된 깊이 있는 내용인가? (+3~5)

## 4. 강조 표현 (최대 15점) — 기본 0점에서 가산
- 볼드체(**) 5개 이상 사용? (+3~5)
- Markdown 표가 1개 이상 포함? (+5~7)
  → 표가 전혀 없으면 **5점 이하**
- 시각적 구분(리스트, 표, 볼드)이 효과적인가? (+2~3)

# 채점 가이드 (최종 점수 = 50 + 각 항목 가산점)
- 85-100: 우수 (모든 기준 충족, 높은 완성도)
- 70-84: 양호 (대부분 기준 충족)
- 55-69: 보통 (주요 기준 일부 미달)
- 55 미만: 미흡 (심각한 결함)

# 출력 (JSON만)
{
  "overallScore": (50 + 가산점 합계),
  "scores": {
    "structure": (0~30),
    "style": (0~25),
    "content": (0~30),
    "emphasis": (0~15)
  },
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "improvements": [
    { "issue": "...", "suggestion": "...", "priority": "high|medium|low" }
  ],
  "needsRewrite": (true if overallScore < 55),
  "verdict": "pass|revise|fail"
}

verdict 기준: pass(70+), revise(55-69), fail(55미만)
JSON 형식으로만 출력하세요.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseContent = (message.content[0] as any).text;
      let jsonStr = responseContent.match(/```json\n([\s\S]*?)\n```/)?.[1] || responseContent;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const review: SectionReview = JSON.parse(jsonStr);

      console.log(`   📊 점수: ${review.overallScore}/100 (${review.verdict.toUpperCase()})`);
      console.log(`      구조: ${review.scores?.structure}/30`);
      console.log(`      개조식: ${review.scores?.style}/25`);
      console.log(`      내용: ${review.scores?.content}/30`);
      console.log(`      강조: ${review.scores?.emphasis}/15`);

      if (review.weaknesses && review.weaknesses.length > 0) {
        console.log(`   ⚠️  약점: ${review.weaknesses.length}개`);
      }

      if (review.improvements && review.improvements.length > 0) {
        console.log(`   💡 개선 제안: ${review.improvements.length}개`);
      }

      return {
        sectionId: section.id || section.title,
        review,
        tokens: message.usage,
        reviewedAt: new Date().toISOString()
      };

    } catch (error: any) {
      console.error(`   ❌ 검수 오류: ${error.message}`);
      
      return {
        sectionId: section.id || section.title,
        review: {
          overallScore: 60,
          verdict: 'revise',
          error: error.message
        },
        error: error.message
      };
    }
  }

  async reviewMultipleSections(sections: Array<{ id?: string; title: string }>, contents: string[]): Promise<ReviewSummary> {
    console.log(`\n✅ [${this.name}] ${sections.length}개 섹션 검수 시작...`);

    const reviews: ReviewResult[] = [];

    for (let i = 0; i < sections.length; i++) {
      const review = await this.reviewSection(sections[i], contents[i]);
      reviews.push(review);

      if (i < sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const avgScore = reviews.reduce((sum, r) => sum + (r.review.overallScore || 0), 0) / reviews.length;
    const passCount = reviews.filter(r => r.review.verdict === 'pass').length;

    console.log(`\n   ✅ 검수 완료`);
    console.log(`   📊 평균 점수: ${avgScore.toFixed(1)}/100`);
    console.log(`   ✔️  통과: ${passCount}/${reviews.length}`);

    return {
      reviews,
      summary: {
        averageScore: avgScore,
        passCount,
        totalCount: reviews.length,
        passRate: (passCount / reviews.length * 100).toFixed(1)
      }
    };
  }

  async reviewDocument(documentStructure: any, sectionContents: string[]): Promise<{ documentReview: DocumentReview; tokens?: any; error?: string }> {
    console.log(`\n✅ [${this.name}] 전체 문서 검수 중...`);

    const prompt = `당신은 엄격한 문서 최종 검수자입니다.

# 문서 구조
${JSON.stringify(documentStructure, null, 2)}

# 전체 검수 항목

1. **완성도 체크**
   - 모든 필수 섹션이 포함되었는가?
   - 섹션 간 일관성이 있는가?

2. **논리적 흐름**
   - 서론 → 본론 → 결론 흐름이 자연스러운가?
   - 섹션 간 연결이 매끄러운가?

3. **전체 품질**
   - 전문성이 유지되는가?
   - 중복 내용은 없는가?

# 출력 형식
{
  "documentScore": 70,
  "completeness": 75,
  "logicalFlow": 70,
  "overallQuality": 65,
  "missingElements": [],
  "redundancies": [],
  "globalImprovements": [],
  "readyForDelivery": false
}

기본 점수 50에서 가산. 관대한 점수 금물.
JSON 형식으로 출력하세요.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = (message.content[0] as any).text;
      let jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const documentReview: DocumentReview = JSON.parse(jsonStr);

      console.log(`   📊 문서 종합 점수: ${documentReview.documentScore}/100`);
      console.log(`   📋 완성도: ${documentReview.completeness}/100`);
      console.log(`   🔗 논리성: ${documentReview.logicalFlow}/100`);
      console.log(`   ⭐ 품질: ${documentReview.overallQuality}/100`);
      console.log(`   ${documentReview.readyForDelivery ? '✅ 납품 가능' : '⚠️  추가 작업 필요'}`);

      return {
        documentReview,
        tokens: message.usage
      };

    } catch (error: any) {
      console.error(`   ❌ 문서 검수 오류: ${error.message}`);
      
      return {
        documentReview: {
          documentScore: 0,
          error: error.message
        },
        error: error.message
      };
    }
  }
}
