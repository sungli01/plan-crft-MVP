/**
 * Image Curator Agent (이미지 큐레이터 에이전트)
 *
 * v4.1 Skywork 전략: 장식용 스톡 이미지 제거, 다이어그램/차트만 허용
 * - photo/search 완전 비활성화
 * - method="generate"(SVG 다이어그램)만 허용
 * - 섹션당 최대 1개, 전체 문서 최대 8개
 */

import Anthropic from '@anthropic-ai/sdk';
import { UnsplashService } from '../services/unsplash';
import { DalleService } from '../services/dalle';

export interface ImageCuratorConfig {
  model?: string;
  unsplashKey?: string;
  openaiKey?: string;
}

export interface ImageSpec {
  type: string;
  method: string;
  position?: string;
  description?: string;
  searchKeywords?: string;
  generatePrompt?: string;
  caption?: string;
}

export interface ImageAnalysis {
  needsImage: boolean;
  images: ImageSpec[];
}

export interface CuratedImage {
  type: string;
  position: string;
  caption: string;
  description: string;
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  source: string;
}

export interface CurationResult {
  images: CuratedImage[];
  totalTokens?: any;
  sectionId?: string;
}

export class ImageCuratorAgent {
  anthropic: Anthropic;
  model: string;
  name: string;
  role: string;
  unsplash: UnsplashService;
  dalle: DalleService;

  constructor(apiKey: string, config: ImageCuratorConfig = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-3-5-haiku-20241022';
    this.name = 'ImageCurator';
    this.role = '이미지 큐레이터';
    
    this.unsplash = new UnsplashService(config.unsplashKey);
    this.dalle = new DalleService(config.openaiKey);
  }

  getSystemPrompt(): string {
    return `You are an extremely strict image curator for professional documents.

## ABSOLUTE RULES — NO EXCEPTIONS
1. **NO stock photos. NO decorative images. NEVER use method="search".**
2. Only method="generate" is allowed (SVG diagrams/charts).
3. Only these image types are permitted:
   - "diagram" — system architecture, component relationships
   - "flowchart" — process flows, decision trees
   - "chart" — data visualization, comparisons, statistics
4. Maximum 1 image per section.
5. Most sections should have NO image (needsImage=false).

## MUST SKIP images for:
✗ Executive summaries, overviews, introductions
✗ Team descriptions, organizational info
✗ Legal, policy, regulatory sections
✗ FAQ sections
✗ References, appendices
✗ Risk management (text-only)
✗ Budget/financial tables (the table itself IS the visualization)
✗ Any section where text alone is sufficient

## ONLY add image when:
✓ System architecture needs visual component diagram
✓ Complex multi-step process needs flowchart
✓ Statistical data needs chart visualization
✓ Technology stack relationships need diagram

## generatePrompt MUST:
- Include specific keywords from the section content (not generic terms)
- Describe what the diagram should show using actual project terminology
- Be specific: "물류센터→배송관리→재고시스템 연동 구조" NOT "시스템 아키텍처"

Return ONLY valid JSON:
{"needsImage":true,"images":[{"type":"diagram","method":"generate","position":"top","description":"...","generatePrompt":"구체적 키워드 포함 프롬프트","caption":"..."}]}

For no image: {"needsImage":false,"images":[]}`;
  }

  async analyzeImageNeeds(section: { title: string }, content: string, retryCount: number = 0): Promise<{ analysis: ImageAnalysis; tokens?: any }> {
    console.log(`\n🖼️  [${this.name}] 이미지 필요성 분석: ${section.title}`);

    const contentSnippet = content?.length > 300
      ? content.slice(0, 300) + '…'
      : (content || '');

    const userPrompt = `Title: ${section.title}\nContent: ${contentSnippet}\n\nDoes this section need a diagram/chart? Be very strict. Return valid JSON only.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.1,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: userPrompt }]
      });

      const responseText = (message.content[0] as any).text;
      
      let jsonStr = responseText.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      jsonStr = jsonStr.replace(/^`+|`+$/g, '').trim();
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
      
      let analysis: ImageAnalysis;
      try {
        analysis = JSON.parse(jsonStr);
      } catch (parseError: any) {
        console.error(`   ❌ 분석 오류: ${parseError.message}`);
        try {
          let fixed = jsonStr
            .replace(/,\s*"[^"]*$/, '')
            .replace(/,\s*\{[^}]*$/, '')
            .replace(/,\s*$/, '');
          const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
          const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
          for (let i = 0; i < openBrackets; i++) fixed += ']';
          for (let i = 0; i < openBraces; i++) fixed += '}';
          analysis = JSON.parse(fixed);
        } catch {
          if (retryCount === 0) {
            console.log(`   🔄 재시도 중...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return this.analyzeImageNeeds(section, content, 1);
          }
          console.error(`   ⚠️ JSON 복구 실패, 이미지 스킵`);
          analysis = { needsImage: false, images: [] };
        }
      }

      // Validate and enforce rules
      if (typeof analysis.needsImage !== 'boolean') {
        analysis.needsImage = false;
      }
      if (!Array.isArray(analysis.images)) {
        analysis.images = [];
      }

      // ENFORCE: No search/photo — only generate with diagram/flowchart/chart
      analysis.images = analysis.images.filter(img => {
        if (img.method === 'search') return false;
        if (img.type === 'photo' || img.type === 'icon') return false;
        return true;
      });

      // Force method to generate
      analysis.images.forEach(img => {
        img.method = 'generate';
      });

      // Max 1 image per section
      if (analysis.images.length > 1) {
        analysis.images = [analysis.images[0]];
      }

      if (analysis.images.length === 0) {
        analysis.needsImage = false;
      }

      if (analysis.needsImage && analysis.images.length > 0) {
        console.log(`   ✅ 다이어그램 1개 필요: ${analysis.images[0].type}`);
      } else {
        console.log(`   ℹ️  이미지 불필요`);
      }

      return { analysis, tokens: message.usage };

    } catch (error: any) {
      console.error(`   ❌ 분석 오류 (최종): ${error.message}`);
      return { analysis: { needsImage: false, images: [] } };
    }
  }

  async searchImages(keywords: string, count: number = 3): Promise<{ images: any[]; source: string }> {
    // Skywork 전략: 스톡 이미지 검색 완전 비활성화
    console.log(`\n🚫 [${this.name}] 스톡 이미지 검색 비활성화 (Skywork 정책)`);
    return { images: [], source: 'none' };
  }

  async generateImage(prompt: string, type: string = 'architecture'): Promise<{ imageUrl: string; revisedPrompt: string; source: string }> {
    console.log(`\n🎨 [${this.name}] 다이어그램 생성 중...`);
    console.log(`   타입: ${type}`);
    console.log(`   프롬프트: ${prompt.slice(0, 80)}...`);

    try {
      const result = await this.dalle.generateDiagram(prompt, type);
      
      if (result.url) {
        console.log(`   ✅ 생성 완료: ${result.source}`);
        return {
          imageUrl: result.url,
          revisedPrompt: result.revisedPrompt,
          source: result.source
        };
      } else {
        const fallback = this.dalle.generateSvgDiagram(prompt, type);
        return {
          imageUrl: fallback.url,
          revisedPrompt: prompt,
          source: fallback.source
        };
      }

    } catch (error: any) {
      console.error(`   ❌ 생성 오류: ${error.message}`);
      const fallback = this.dalle.generateSvgDiagram(prompt, type);
      return {
        imageUrl: fallback.url,
        revisedPrompt: prompt,
        source: fallback.source
      };
    }
  }

  async curateImagesForSection(section: { id?: string; title: string }, content: string): Promise<CurationResult> {
    const { analysis, tokens } = await this.analyzeImageNeeds(section, content);

    if (!analysis.needsImage || !analysis.images || analysis.images.length === 0) {
      return { images: [], totalTokens: tokens };
    }

    const curatedImages: CuratedImage[] = [];

    for (const imageSpec of analysis.images) {
      try {
        // Only generate method allowed
        const prompt = imageSpec.generatePrompt || imageSpec.description || section.title;
        const diagramType = this._mapTypeToDiagramType(imageSpec.type);
        const generateResult = await this.generateImage(prompt, diagramType);
        if (generateResult.imageUrl) {
          curatedImages.push({
            type: imageSpec.type,
            position: imageSpec.position || 'top',
            caption: imageSpec.caption || imageSpec.description || '',
            description: imageSpec.description || '',
            url: generateResult.imageUrl,
            thumb: generateResult.imageUrl,
            alt: imageSpec.description || section.title,
            credit: generateResult.source === 'dalle-3' ? 'Generated by DALL-E 3' : 'SVG Diagram',
            source: generateResult.source || 'generated'
          });
        }
      } catch (error: any) {
        console.error(`   ⚠️  다이어그램 생성 실패 (${imageSpec.type}): ${error.message}`);
        // No placeholder fallback — skip instead (Skywork policy)
      }
    }

    return {
      images: curatedImages,
      totalTokens: tokens
    };
  }

  _mapTypeToDiagramType(type: string): string {
    const mapping: Record<string, string> = {
      'diagram': 'architecture',
      'architecture': 'architecture',
      'flowchart': 'flowchart',
      'flow': 'flowchart',
      'chart': 'chart',
      'graph': 'chart',
      'workflow': 'workflow',
      'process': 'flowchart',
    };
    return mapping[type] || 'default';
  }

  async batchCurateImages(sections: Array<{ id?: string; title: string }>, contents: string[]): Promise<CurationResult[]> {
    console.log(`\n🖼️  [${this.name}] ${sections.length}개 섹션 이미지 큐레이션 시작 (Skywork 정책: 다이어그램만, 최대 8개)...`);

    const results: CurationResult[] = [];
    let totalImageCount = 0;
    const MAX_DOCUMENT_IMAGES = 8;

    for (let i = 0; i < sections.length; i++) {
      // Global cap: stop analyzing once we hit 8 images
      if (totalImageCount >= MAX_DOCUMENT_IMAGES) {
        results.push({ sectionId: sections[i].id || sections[i].title, images: [] });
        continue;
      }

      const result = await this.curateImagesForSection(sections[i], contents[i]);
      totalImageCount += result.images.length;

      // Trim if over global cap
      if (totalImageCount > MAX_DOCUMENT_IMAGES) {
        const excess = totalImageCount - MAX_DOCUMENT_IMAGES;
        result.images = result.images.slice(0, result.images.length - excess);
        totalImageCount = MAX_DOCUMENT_IMAGES;
      }

      results.push({
        sectionId: sections[i].id || sections[i].title,
        ...result
      });

      if (i < sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n   ✅ 큐레이션 완료: 총 ${totalImageCount}개 다이어그램 (최대 ${MAX_DOCUMENT_IMAGES}개)`);
    
    const sourceCounts: Record<string, number> = {};
    results.forEach(r => r.images.forEach(img => {
      sourceCounts[img.source] = (sourceCounts[img.source] || 0) + 1;
    }));
    if (Object.keys(sourceCounts).length > 0) {
      console.log(`   📊 소스 분포: ${Object.entries(sourceCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    }

    return results;
  }
}
