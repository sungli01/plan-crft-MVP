/**
 * DALL-E 3 이미지 생성 서비스 v2
 * 맞춤 프롬프트: 프레젠테이션용 인포그래픽/다이어그램 특화
 * URL은 1시간 유효 → 문서 생성 시 즉시 사용
 */

import OpenAI from 'openai';

export interface DalleV2Config {
  apiKey?: string;
}

export interface DiagramResult {
  url: string;
  revisedPrompt: string;
  source: 'dalle-3' | 'svg-fallback';
}

// Diagram categories with tailored prompts
const DIAGRAM_PROMPTS: Record<string, (desc: string) => string> = {
  'system-architecture': (desc) =>
    `Clean professional infographic diagram showing system architecture: ${desc}. White background, minimal flat design style, connected boxes with arrows, modern tech look, no text labels, subtle blue and gray color scheme.`,

  'process-flow': (desc) =>
    `Clean professional process flow infographic: ${desc}. White background, sequential steps connected by arrows, minimal flat icons, modern corporate style, no text, blue gradient accents.`,

  'concept-diagram': (desc) =>
    `Clean professional concept diagram: ${desc}. White background, interconnected circles and shapes, minimal modern style, abstract business infographic, no text, blue and green tones.`,

  'market-overview': (desc) =>
    `Clean professional market analysis infographic illustration: ${desc}. White background, abstract data visualization elements, growth charts, minimal flat design, no text, modern business style.`,

  'comparison': (desc) =>
    `Clean professional comparison infographic: ${desc}. White background, side by side visual elements, minimal flat design, modern corporate style, no text, contrasting blue and orange colors.`,

  'roadmap': (desc) =>
    `Clean professional timeline roadmap infographic: ${desc}. White background, horizontal timeline with milestone markers, minimal flat design, modern business style, no text, blue progression.`,

  'team-org': (desc) =>
    `Clean professional organizational structure infographic: ${desc}. White background, hierarchical connected nodes, minimal flat design, modern corporate style, no text, blue and gray tones.`,

  'technology': (desc) =>
    `Clean professional technology stack diagram: ${desc}. White background, layered architecture blocks, minimal flat design, modern tech style, no text, blue and purple gradients.`,
};

export class DalleV2Service {
  private openai: OpenAI | null = null;
  private available: boolean;

  constructor(config: DalleV2Config = {}) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'undefined' && apiKey.trim() !== '') {
      this.openai = new OpenAI({ apiKey });
      this.available = true;
    } else {
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Generate a diagram image with DALL-E 3
   * Falls back to placeholder SVG if unavailable
   */
  async generateDiagram(
    description: string,
    category: string = 'concept-diagram',
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1792x1024'
  ): Promise<DiagramResult> {
    if (!this.openai) {
      console.log(`   ℹ️  DALL-E unavailable, using SVG placeholder`);
      return this.svgFallback(description, category);
    }

    const promptFn = DIAGRAM_PROMPTS[category] || DIAGRAM_PROMPTS['concept-diagram'];
    const prompt = promptFn(description);

    try {
      console.log(`   🎨 DALL-E 3 generating: ${category} — ${description.slice(0, 60)}...`);
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
      });

      const imageUrl = response.data[0].url!;
      const revisedPrompt = response.data[0].revised_prompt || prompt;

      console.log(`   ✅ DALL-E 3 image generated`);
      return { url: imageUrl, revisedPrompt, source: 'dalle-3' };
    } catch (error: any) {
      console.warn(`   ⚠️  DALL-E failed: ${error.message}, using SVG fallback`);
      return this.svgFallback(description, category);
    }
  }

  /**
   * SVG placeholder fallback
   */
  private svgFallback(description: string, category: string): DiagramResult {
    const title = description.slice(0, 50).replace(/[<>&"']/g, '');
    const catLabel = category.replace(/-/g, ' ');
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 896 512" style="font-family:system-ui,sans-serif">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#EFF6FF"/>
          <stop offset="100%" style="stop-color:#DBEAFE"/>
        </linearGradient>
      </defs>
      <rect width="896" height="512" fill="url(#bg)" rx="16"/>
      <rect x="24" y="24" width="848" height="464" fill="white" rx="12" stroke="#2563EB" stroke-width="1"/>
      <rect x="24" y="24" width="848" height="56" fill="#2563EB" rx="12 12 0 0"/>
      <rect x="24" y="68" width="848" height="12" fill="#2563EB"/>
      <text x="448" y="60" text-anchor="middle" font-size="18" font-weight="bold" fill="white">${catLabel}</text>
      <text x="448" y="120" text-anchor="middle" font-size="14" fill="#6B7280">${title}</text>
      <rect x="248" y="160" width="400" height="200" fill="#F8FAFC" rx="12" stroke="#E2E8F0" stroke-width="1"/>
      <text x="448" y="265" text-anchor="middle" font-size="16" fill="#94A3B8">📊 Visual Placeholder</text>
      <text x="448" y="295" text-anchor="middle" font-size="12" fill="#CBD5E1">DALL-E 3 image will appear here</text>
    </svg>`;

    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return { url: dataUri, revisedPrompt: description, source: 'svg-fallback' };
  }
}
