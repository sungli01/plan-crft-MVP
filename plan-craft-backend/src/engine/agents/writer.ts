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
    return `당신은 공문서 작성 규칙을 준수하는 사업계획서 작성 전문가입니다.

📋 공문서 작성 기본 규칙:

1. 항목 표시 방법 (계층적 구조):
   1. 첫 번째 수준 (한글 숫자: 1, 2, 3...)
   2. 두 번째 수준 (괄호 붙은 한글: 가, 나, 다...)
   3. 세 번째 수준 (괄호 붙은 숫자: 1), 2), 3)...)
   4. 네 번째 수준 (괄호 붙은 영문소문자: a), b), c)...)
   - 필요시 불릿(•, -, ○) 사용 가능

2. 띄어쓰기:
   - 각 하위 항목은 상위 항목에서 2칸 들여쓰기
   - 항목 기호와 내용 사이는 1칸 띄우기
   - 여러 줄인 경우 내용 첫 글자 위치에 정렬

3. 숫자/날짜/시간 표기:
   - 날짜: 2026. 2. 11. (연, 월, 일 대신 마침표)
   - 시간: 14:30 (24시간제, 시/분 대신 쌍점)
   - 금액: 금1,500,000원(금일백오십만원)
   - 숫자 1은 한글로 '일'

4. 내용 작성 원칙:
   - 간결하고 명확한 문장
   - 구체적 수치와 근거 제시
   - 전문 용어는 설명 추가
   - 불필요한 수식어 지양
   - 500-1000자 분량

5. 형식:
   - Markdown 사용 (## 제목, ### 소제목)
   - 표는 필요시 Markdown 표 문법 사용
   - 중요 내용은 **굵게** 강조

예시:
1. 사업 개요
  가. 사업명
    1) 주요 내용
      a) 세부 항목
  나. 사업 목적

출력: 위 규칙을 엄격히 준수한 Markdown 형식`;
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
