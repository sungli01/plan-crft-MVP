/**
 * Image Curator Agent (이미지 큐레이터 에이전트)
 *
 * Fallback chain:
 * - Search: Unsplash API → Picsum Photos → SVG placeholder
 * - Generate: DALL-E 3 → Professional SVG diagrams
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
    return `You are a strict image curator for business documents. Analyze if a section TRULY needs images.

CRITICAL RELEVANCE RULES:
1. Images must be DIRECTLY related to the section content
2. Generic/decorative images are NOT allowed
3. Only add images if they add REAL value (explanation, data visualization, process flow)
4. If in doubt, return needsImage=false
5. For business plans: prefer diagrams/charts over photos

When to ADD images:
✓ Data/statistics sections → charts
✓ Process descriptions → flowcharts
✓ System architecture → diagrams
✓ Market analysis → charts/graphs
✓ Financial projections → tables/charts

When to SKIP images:
✗ Simple text descriptions
✗ Executive summaries
✗ Legal/policy sections
✗ General introductions
✗ Contact information

Technical rules:
1. Return ONLY valid JSON (no markdown, no code blocks)
2. Use double quotes for all strings
3. Escape special characters properly
4. Image types: diagram, flowchart, chart, photo, icon, table
5. Methods: "search" (photos) or "generate" (diagrams/charts)
6. Positions: top, middle, bottom

Required JSON format:
{"needsImage":true,"images":[{"type":"diagram","method":"generate","position":"top","description":"Brief description","searchKeywords":"","generatePrompt":"","caption":"Image caption"}]}

If no images needed:
{"needsImage":false,"images":[]}`;
  }

  async analyzeImageNeeds(section: { title: string }, content: string, retryCount: number = 0): Promise<{ analysis: ImageAnalysis; tokens?: any }> {
    console.log(`\n🖼️  [${this.name}] 이미지 필요성 분석: ${section.title}`);

    const contentSnippet = content?.length > 200
      ? content.slice(0, 200) + '…'
      : (content || '');

    const userPrompt = `Title: ${section.title}\nContent: ${contentSnippet}\n\nReturn valid JSON only.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.3,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: userPrompt }]
      });

      const responseText = (message.content[0] as any).text;
      
      // Clean JSON extraction
      let jsonStr = responseText.trim();
      
      // Remove markdown code blocks if present
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      
      // Remove any remaining backticks
      jsonStr = jsonStr.replace(/^`+|`+$/g, '').trim();
      
      // Extract JSON object if embedded in text
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
      
      // Attempt to parse
      let analysis: ImageAnalysis;
      try {
        analysis = JSON.parse(jsonStr);
      } catch (parseError: any) {
        console.error(`   ❌ 분석 오류: ${parseError.message}`);
        
        // Try to salvage truncated JSON
        try {
          // Remove trailing incomplete entries and close brackets
          let fixed = jsonStr
            .replace(/,\s*"[^"]*$/, '')     // remove trailing incomplete key
            .replace(/,\s*\{[^}]*$/, '')    // remove trailing incomplete object
            .replace(/,\s*$/, '');           // remove trailing comma
          // Close any open arrays/brackets
          const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
          const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
          for (let i = 0; i < openBrackets; i++) fixed += ']';
          for (let i = 0; i < openBraces; i++) fixed += '}';
          analysis = JSON.parse(fixed);
          console.log(`   🔧 잘린 JSON 복구 성공`);
        } catch {
          // Retry once with more explicit prompt
          if (retryCount === 0) {
            console.log(`   🔄 재시도 중...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            return this.analyzeImageNeeds(section, content, 1);
          }
          // Final fallback: no images
          console.error(`   ⚠️ JSON 복구 실패, 이미지 스킵`);
          analysis = { needsImage: false, images: [] };
        }
      }

      // Validate structure
      if (typeof analysis.needsImage !== 'boolean') {
        analysis.needsImage = false;
      }
      if (!Array.isArray(analysis.images)) {
        analysis.images = [];
      }

      if (analysis.needsImage && analysis.images.length > 0) {
        console.log(`   ✅ 이미지 ${analysis.images.length}개 필요`);
        analysis.images.forEach((img, i) => {
          console.log(`      ${i + 1}. ${img.type} (${img.method}) - ${img.caption || img.description}`);
        });
      } else {
        analysis.needsImage = false;
        analysis.images = [];
        console.log(`   ℹ️  이미지 불필요`);
      }

      return {
        analysis,
        tokens: message.usage
      };

    } catch (error: any) {
      console.error(`   ❌ 분석 오류 (최종): ${error.message}`);
      return {
        analysis: { needsImage: false, images: [] },
      };
    }
  }

  async searchImages(keywords: string, count: number = 3): Promise<{ images: any[]; source: string }> {
    console.log(`\n🔍 [${this.name}] 이미지 검색: "${keywords}"`);

    try {
      const results = await this.unsplash.searchPhotos(keywords, { count });
      
      if (results.length > 0) {
        console.log(`   ✅ ${results.length}개 이미지 찾음 (${results[0].source})`);
        return {
          images: results,
          source: results[0].source
        };
      } else {
        console.log(`   ℹ️  검색 결과 없음, SVG 플레이스홀더 생성`);
        const placeholder = this.unsplash.generateSvgPlaceholder(keywords);
        return {
          images: [placeholder],
          source: 'svg-placeholder'
        };
      }

    } catch (error: any) {
      console.error(`   ❌ 검색 오류: ${error.message}`);
      const placeholder = this.unsplash.generateSvgPlaceholder(keywords);
      return { images: [placeholder], source: 'svg-placeholder' };
    }
  }

  async generateImage(prompt: string, type: string = 'architecture'): Promise<{ imageUrl: string; revisedPrompt: string; source: string }> {
    console.log(`\n🎨 [${this.name}] 이미지 생성 중...`);
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
        console.log(`   ⚠️  생성 실패, SVG 폴백 사용`);
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
        if (imageSpec.method === 'search') {
          const keywords = imageSpec.searchKeywords || imageSpec.description || section.title;
          const searchResult = await this.searchImages(keywords);
          if (searchResult.images.length > 0) {
            const img = searchResult.images[0];
            curatedImages.push({
              type: imageSpec.type,
              position: imageSpec.position || 'top',
              caption: imageSpec.caption || imageSpec.description || '',
              description: imageSpec.description || '',
              url: img.url,
              thumb: img.thumb || img.url,
              alt: img.alt || imageSpec.description || section.title,
              credit: img.credit || '',
              source: img.source || 'search'
            });
          }
        } else if (imageSpec.method === 'generate') {
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
        }
      } catch (error: any) {
        console.error(`   ⚠️  이미지 처리 실패 (${imageSpec.type}): ${error.message}`);
        const placeholder = this.unsplash.generateSvgPlaceholder(
          imageSpec.description || imageSpec.caption || section.title
        );
        curatedImages.push({
          type: imageSpec.type,
          position: imageSpec.position || 'top',
          caption: imageSpec.caption || imageSpec.description || '',
          description: imageSpec.description || '',
          url: placeholder.url,
          thumb: placeholder.url,
          alt: imageSpec.description || section.title,
          credit: 'Placeholder',
          source: 'svg-placeholder'
        });
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
    console.log(`\n🖼️  [${this.name}] ${sections.length}개 섹션 이미지 큐레이션 시작...`);

    const results: CurationResult[] = [];

    for (let i = 0; i < sections.length; i++) {
      const result = await this.curateImagesForSection(sections[i], contents[i]);
      results.push({
        sectionId: sections[i].id || sections[i].title,
        ...result
      });

      if (i < sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalImages = results.reduce((sum, r) => sum + r.images.length, 0);
    console.log(`\n   ✅ 큐레이션 완료: 총 ${totalImages}개 이미지`);
    
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
