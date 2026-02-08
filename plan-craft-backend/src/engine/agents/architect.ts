/**
 * Architect Agent (설계자 에이전트)
 *
 * Token optimization:
 * - Static instructions in system prompt (auto-cached by Anthropic)
 * - Compressed user prompt with only dynamic data
 * - max_tokens reduced from 8000 → 4000
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ArchitectConfig {
  model?: string;
}

export interface ProjectInfo {
  title: string;
  idea?: string;
  projectId?: string;
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

export interface DocumentDesign {
  documentTitle: string;
  structure: DesignSection[];
  imageRequirements?: Array<{ sectionId: string; type: string; description: string }>;
  estimatedTotalPages: number;
}

export interface DesignResult {
  design: DocumentDesign;
  tokens: any;
  generatedAt: string;
}

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

  getSystemPrompt(): string {
    return `사업계획서 구조 설계 전문가. 25개 섹션 구성.
각 섹션에 importance 분류 필수: core(핵심)/standard(일반)/simple(부록).
순수 JSON만 출력 (마크다운 코드블록 없이).

출력 스키마:
{"documentTitle":"","structure":[{"level":1,"title":"","priority":"high|medium|low","subsections":[{"level":2,"title":"","importance":"core|standard|simple","needsImage":true,"imageType":"diagram|flowchart|chart|photo","estimatedWords":500}]}],"imageRequirements":[{"sectionId":"","type":"diagram","description":""}],"estimatedTotalPages":200}`;
  }

  async designStructure(projectInfo: ProjectInfo): Promise<DesignResult> {
    console.log(`\n📐 [${this.name}] 문서 구조 설계 시작...`);

    const ideaSummary = projectInfo.idea && projectInfo.idea.length > 100
      ? projectInfo.idea.slice(0, 100) + '…'
      : projectInfo.idea;

    const userPrompt = `과제: ${projectInfo.title}\n아이디어: ${ideaSummary}`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.7,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: userPrompt }]
      });

      const content = (message.content[0] as any).text;
      
      // JSON 추출 (코드 블록 제거)
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      } else if (content.includes('```')) {
        jsonStr = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
      }
      
      const design: DocumentDesign = JSON.parse(jsonStr);

      console.log(`   ✅ 설계 완료`);
      console.log(`   📊 대제목: ${design.structure.length}개`);
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

    const prompt = `기존 설계:\n${JSON.stringify(design)}\n\n피드백: ${feedback}\n\n위 피드백 반영하여 개선. 순수 JSON 출력.`;

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 4000,
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
