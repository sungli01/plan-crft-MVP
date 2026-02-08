/**
 * Writer Agent (작성자 에이전트)
 *
 * Token optimization:
 * - Static system prompt (auto-cached by Anthropic on repeated calls)
 * - User prompt compressed: only current/prev/next section titles, truncated idea
 * - max_tokens set per section importance via ModelRouter budget
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

  getSystemPrompt(): string {
    return `사업계획서 작성 전문가.

규칙:
- 개조식 작성 (번호/불릿)
- 계층 구조 (## / ###)
- 구체적 수치 포함
- 500-1000자

출력: Markdown`;
  }

  async writeSection(section: SectionInfo, projectInfo: { title: string; idea?: string }, context: WriteContext = {}): Promise<WriteSectionResult> {
    console.log(`\n✍️  [${this.name}] 섹션 작성 중: ${section.title}`);

    const ideaSummary = projectInfo.idea && projectInfo.idea.length > 100
      ? projectInfo.idea.slice(0, 100) + '…'
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
${section.requirements ? `내용: ${section.requirements.join(', ')}` : ''}
${section.estimatedWords ? `목표: ${section.estimatedWords}자 이상` : ''}`;

    const model = section.model || this.model;
    const maxTokens = section.maxTokens || 2000;

    try {
      const startTime = Date.now();

      const message = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.7,
        system: this.getSystemPrompt(),
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

  async writeMultipleSections(sections: SectionInfo[], projectInfo: { title: string; idea?: string }, options: { context?: WriteContext } = {}): Promise<WriteSectionResult[]> {
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

  async improveSection(sectionContent: string, feedback: string): Promise<{ content: string; tokens: any }> {
    console.log(`\n✍️  [${this.name}] 섹션 개선 중...`);

    const prompt = `기존:\n${sectionContent}\n\n개선 요청: ${feedback}\n\nMarkdown 출력.`;

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 2000,
      temperature: 0.7,
      system: this.getSystemPrompt(),
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
