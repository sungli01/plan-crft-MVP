/**
 * Writer Agent (작성자 에이전트)
 * 
 * 역할:
 * - 섹션별 내용 생성
 * - 계층 구조 적용
 * - 개조식 표현 사용
 * - 품질 기준 준수
 */

import Anthropic from '@anthropic-ai/sdk';

export class WriterAgent {
  constructor(apiKey, config = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-opus-4-6';
    this.name = 'Writer';
    this.role = '내용 작성자';
  }

  getSystemPrompt() {
    return `당신은 국가 R&D 사업계획서 작성 전문가입니다.

# 핵심 원칙

1. **계층 구조 준수**
   - 대제목(#) → 중제목(##) → 소제목(###) → 본문
   - 각 계층은 명확히 구분

2. **개조식 표현**
   - 번호 매기기: 순서가 있는 내용
   - 불릿 포인트: 병렬적 나열
   - 혼용: 계층적 구조

3. **논리적 전개**
   - 명확한 주제문
   - 구체적 근거와 사례
   - 명확한 결론

4. **품질 기준**
   - 구체적 수치와 데이터
   - 정확한 전문 용어
   - 간결하고 명확한 문장
   - 중복 제거

# 출력 형식

## 중제목

### 소제목

1. **첫 번째 주요 항목**
   - 세부 사항 1
   - 세부 사항 2

2. **두 번째 주요 항목**
   - 세부 사항 1
     - 더 상세한 내용
   - 세부 사항 2

**강조 내용**은 볼드체를 사용하고, 중요 수치는 명확히 표기합니다.`;
  }

  async writeSection(section, projectInfo, context = {}) {
    console.log(`\n✍️  [${this.name}] 섹션 작성 중: ${section.title}`);

    const userPrompt = `# 작성 섹션
${section.title}

# 프로젝트 정보
- **과제명**: ${projectInfo.title}
- **핵심 아이디어**: ${projectInfo.idea}

# 섹션 요구사항
${section.requirements ? section.requirements.map((req, i) => `${i + 1}. ${req}`).join('\n') : ''}

# 추가 컨텍스트
${context.previousSections ? `이전 섹션 요약:\n${context.previousSections}` : ''}

# 작성 지침

1. **계층 구조를 명확히**
   - 제목(##), 소제목(###) 사용
   - 각 소제목 아래 번호/불릿 포인트

2. **개조식으로 작성**
   - 각 항목은 간결하고 명확하게
   - 필요시 하위 항목으로 상세 설명
   - 표가 필요하면 Markdown 테이블 사용

3. **구체성 유지**
   - 추상적 표현 → 구체적 수치
   - 일반론 → 프로젝트 맞춤 내용
   - 실제 사례 제시

4. **품질 검증**
   - 각 항목 최소 2-3줄 설명
   - 논리적 흐름 확인
   - 중복 제거

위 지침에 따라 **${section.title}** 섹션을 작성해주세요.

${section.estimatedWords ? `목표 단어 수: ${section.estimatedWords}단어 이상` : ''}

반드시 Markdown 형식으로 출력하고, 계층 구조와 개조식을 정확히 따라주세요.`;

    try {
      const startTime = Date.now();

      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: section.maxTokens || 8000,
        temperature: 0.7,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: userPrompt }]
      });

      const content = message.content[0].text;
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

    } catch (error) {
      console.error(`   ❌ 오류: ${error.message}`);
      throw error;
    }
  }

  async writeMultipleSections(sections, projectInfo, options = {}) {
    console.log(`\n✍️  [${this.name}] ${sections.length}개 섹션 병렬 작성 시작...`);

    const promises = sections.map(section => 
      this.writeSection(section, projectInfo, options.context)
    );

    try {
      const results = await Promise.all(promises);
      console.log(`   ✅ 모든 섹션 작성 완료`);
      return results;

    } catch (error) {
      console.error(`   ❌ 병렬 작성 오류: ${error.message}`);
      throw error;
    }
  }

  async improveSection(sectionContent, feedback) {
    console.log(`\n✍️  [${this.name}] 섹션 개선 중...`);

    const prompt = `# 기존 내용
${sectionContent}

# 개선 요청
${feedback}

위 피드백을 반영하여 내용을 개선하세요. Markdown 형식으로 출력하세요.`;

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 8000,
      temperature: 0.7,
      system: this.getSystemPrompt(),
      messages: [{ role: 'user', content: prompt }]
    });

    const improvedContent = message.content[0].text;
    console.log(`   ✅ 개선 완료`);

    return {
      content: improvedContent,
      tokens: message.usage
    };
  }
}
