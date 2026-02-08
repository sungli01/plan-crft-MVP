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
    this.name = config.name || 'Writer';
    this.role = '내용 작성자';
  }

  getSystemPrompt() {
    return `사업계획서 작성 전문가.

규칙:
- 개조식 작성 (번호/불릿)
- 계층 구조 (## / ###)
- 구체적 수치 포함
- 500-1000자

출력: Markdown`;
  }

  async writeSection(section, projectInfo, context = {}) {
    console.log(`\n✍️  [${this.name}] 섹션 작성 중: ${section.title}`);

    const userPrompt = `섹션: ${section.title}

과제: ${projectInfo.title}
개요: ${projectInfo.idea}

요구사항:
- 개조식 작성
- 구체적 내용
- 500-1000자
${section.requirements ? `\n내용: ${section.requirements.join(', ')}` : ''}

출력:`;

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
