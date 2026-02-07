/**
 * Reviewer Agent (검수자 에이전트)
 * 
 * 역할:
 * - 문서 품질 검증
 * - 논리적 일관성 체크
 * - 개선 제안
 * - 재작성 필요 여부 판단
 */

import Anthropic from '@anthropic-ai/sdk';

export class ReviewerAgent {
  constructor(apiKey, config = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-sonnet-4-20250514'; // Reviewer는 Sonnet으로도 충분
    this.name = 'Reviewer';
    this.role = '품질 검수자';
  }

  async reviewSection(section, content, criteria = {}) {
    console.log(`\n✅ [${this.name}] 섹션 검수: ${section.title}`);

    const prompt = `당신은 국가 R&D 사업계획서 품질 검수 전문가입니다.

# 검수 대상
제목: ${section.title}

내용:
${content}

# 검수 기준

## 1. 구조 (30점)
- [ ] 계층 구조가 명확한가? (##, ###)
- [ ] 제목과 내용이 일치하는가?
- [ ] 논리적 흐름이 자연스러운가?

## 2. 개조식 표현 (25점)
- [ ] 번호 매기기가 적절히 사용되었는가?
- [ ] 불릿 포인트가 적절히 사용되었는가?
- [ ] 각 항목이 간결하고 명확한가?

## 3. 내용 품질 (30점)
- [ ] 구체적 수치와 데이터가 포함되었는가?
- [ ] 전문 용어가 정확히 사용되었는가?
- [ ] 중복이나 불필요한 내용이 없는가?

## 4. 강조 표현 (15점)
- [ ] 중요 내용에 볼드체(**) 사용?
- [ ] 표나 목록이 적절히 사용되었는가?

# 임무
위 기준에 따라 검수하고 다음을 출력하세요:

{
  "overallScore": 85,
  "scores": {
    "structure": 25,
    "style": 20,
    "content": 27,
    "emphasis": 13
  },
  "strengths": [
    "계층 구조가 명확함",
    "구체적 데이터 포함"
  ],
  "weaknesses": [
    "일부 항목이 너무 길어 가독성 저하",
    "표 사용 부족"
  ],
  "improvements": [
    {
      "issue": "2번 항목이 너무 김",
      "suggestion": "2-1, 2-2로 분할 권장",
      "priority": "high"
    }
  ],
  "needsRewrite": false,
  "verdict": "pass"
}

verdict: pass (통과) / revise (수정 필요) / fail (재작성 필요)

JSON 형식으로만 출력하세요.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseContent = message.content[0].text;
      let jsonStr = responseContent.match(/```json\n([\s\S]*?)\n```/)?.[1] || responseContent;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const review = JSON.parse(jsonStr);

      console.log(`   📊 점수: ${review.overallScore}/100 (${review.verdict.toUpperCase()})`);
      console.log(`      구조: ${review.scores.structure}/30`);
      console.log(`      개조식: ${review.scores.style}/25`);
      console.log(`      내용: ${review.scores.content}/30`);
      console.log(`      강조: ${review.scores.emphasis}/15`);

      if (review.weaknesses.length > 0) {
        console.log(`   ⚠️  약점: ${review.weaknesses.length}개`);
      }

      if (review.improvements.length > 0) {
        console.log(`   💡 개선 제안: ${review.improvements.length}개`);
      }

      return {
        sectionId: section.id || section.title,
        review,
        tokens: message.usage,
        reviewedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`   ❌ 검수 오류: ${error.message}`);
      
      // 오류 시 기본 점수 반환
      return {
        sectionId: section.id || section.title,
        review: {
          overallScore: 50,
          verdict: 'error',
          error: error.message
        },
        error: error.message
      };
    }
  }

  async reviewMultipleSections(sections, contents) {
    console.log(`\n✅ [${this.name}] ${sections.length}개 섹션 검수 시작...`);

    const reviews = [];

    for (let i = 0; i < sections.length; i++) {
      const review = await this.reviewSection(sections[i], contents[i]);
      reviews.push(review);

      // Rate limiting
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

  async reviewDocument(documentStructure, sectionContents) {
    console.log(`\n✅ [${this.name}] 전체 문서 검수 중...`);

    const prompt = `당신은 국가 R&D 사업계획서 최종 검수자입니다.

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
  "documentScore": 88,
  "completeness": 90,
  "logicalFlow": 85,
  "overallQuality": 90,
  "missingElements": [],
  "redundancies": [],
  "globalImprovements": [],
  "readyForDelivery": true
}

JSON 형식으로 출력하세요.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = message.content[0].text;
      let jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const documentReview = JSON.parse(jsonStr);

      console.log(`   📊 문서 종합 점수: ${documentReview.documentScore}/100`);
      console.log(`   📋 완성도: ${documentReview.completeness}/100`);
      console.log(`   🔗 논리성: ${documentReview.logicalFlow}/100`);
      console.log(`   ⭐ 품질: ${documentReview.overallQuality}/100`);
      console.log(`   ${documentReview.readyForDelivery ? '✅ 납품 가능' : '⚠️  추가 작업 필요'}`);

      return {
        documentReview,
        tokens: message.usage
      };

    } catch (error) {
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
