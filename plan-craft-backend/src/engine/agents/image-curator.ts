/**
 * Image Curator Agent (이미지 큐레이터 에이전트)
 *
 * v5.0: Brave Search 이미지 RAG 통합
 * - Brave Search로 섹션 관련 고품질 이미지 검색 (95%+ 관련성)
 * - AI 기반 관련성 평가
 * - fallback: 기존 SVG 다이어그램
 * - 섹션당 최대 1개, 전체 문서 최대 8개
 */

import Anthropic from '@anthropic-ai/sdk';
import { UnsplashService } from '../services/unsplash';
import { DalleService } from '../services/dalle';
import { BraveImageSearchService, ScoredImage } from '../services/brave-image-search';

export interface ImageCuratorConfig {
  model?: string;
  unsplashKey?: string;
  openaiKey?: string;
  braveSearchKey?: string;
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
  braveSearch: BraveImageSearchService;

  constructor(apiKey: string, config: ImageCuratorConfig = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-3-5-haiku-20241022';
    this.name = 'ImageCurator';
    this.role = '이미지 큐레이터';
    
    this.unsplash = new UnsplashService(config.unsplashKey);
    this.dalle = new DalleService(config.openaiKey);
    this.braveSearch = new BraveImageSearchService(config.braveSearchKey, apiKey);
  }

  getSystemPrompt(): string {
    const braveAvailable = this.braveSearch.isAvailable();

    return `You are an image curator for professional documents.

## IMAGE SOURCING STRATEGY
${braveAvailable ? `### PRIMARY: Web Image Search (Brave Search RAG)
- For sections that would benefit from a real photograph or infographic
- method="brave-search" — AI will find and evaluate real web images
- Only images scoring 95%+ relevance will be used
- Suitable for: market analysis, industry trends, technology concepts, real-world examples

### SECONDARY: SVG Diagrams (fallback)` : '### PRIMARY: SVG Diagrams'}
- method="generate" — programmatic SVG diagram
- Best for: system architecture, process flows, data charts, workflows
- Types: "diagram", "flowchart", "chart", "workflow"

## RULES
1. Maximum 1 image per section
2. Most sections should have NO image (needsImage=false)
3. ${braveAvailable ? 'Prefer method="brave-search" for conceptual/visual topics, method="generate" for technical diagrams' : 'Only method="generate" allowed'}

## MUST SKIP images for:
✗ Executive summaries, overviews, introductions
✗ Team descriptions, organizational info  
✗ Legal, policy, regulatory sections
✗ FAQ, references, appendices
✗ Budget/financial tables (table IS the visualization)
✗ Risk management (text-only usually sufficient)

## ONLY add image when:
✓ System architecture needs visual component diagram → method="generate"
✓ Complex multi-step process needs flowchart → method="generate"
✓ Statistical data needs chart visualization → method="generate"
${braveAvailable ? `✓ Market/industry analysis benefits from real imagery → method="brave-search"
✓ Technology concept benefits from real photo → method="brave-search"
✓ Implementation/execution plan with real-world context → method="brave-search"` : ''}

## generatePrompt (for method="generate") MUST:
- Include specific keywords from the section content
- Describe what the diagram should show using actual project terminology

Return ONLY valid JSON:
${braveAvailable
  ? `{"needsImage":true,"images":[{"type":"brave-search","method":"brave-search","position":"top","description":"이미지 설명","caption":"캡션"}]}`
  : `{"needsImage":true,"images":[{"type":"diagram","method":"generate","position":"top","description":"...","generatePrompt":"구체적 프롬프트","caption":"..."}]}`}

For no image: {"needsImage":false,"images":[]}`;
  }

  async analyzeImageNeeds(section: { title: string }, content: string, retryCount: number = 0): Promise<{ analysis: ImageAnalysis; tokens?: any }> {
    console.log(`\n🖼️  [${this.name}] 이미지 필요성 분석: ${section.title}`);

    const contentSnippet = content?.length > 300
      ? content.slice(0, 300) + '…'
      : (content || '');

    const userPrompt = `Title: ${section.title}\nContent: ${contentSnippet}\n\nDoes this section need an image? Be selective. Return valid JSON only.`;

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

      // Validate
      if (typeof analysis.needsImage !== 'boolean') analysis.needsImage = false;
      if (!Array.isArray(analysis.images)) analysis.images = [];

      // Filter invalid methods
      const braveAvailable = this.braveSearch.isAvailable();
      analysis.images = analysis.images.filter(img => {
        if (img.method === 'brave-search' && braveAvailable) return true;
        if (img.method === 'generate') return true;
        // Legacy "search" method → convert to brave-search if available
        if (img.method === 'search' && braveAvailable) {
          img.method = 'brave-search';
          return true;
        }
        if (img.method === 'search') return false;
        if (img.type === 'photo' || img.type === 'icon') {
          if (braveAvailable) { img.method = 'brave-search'; return true; }
          return false;
        }
        // Default to generate
        img.method = 'generate';
        return true;
      });

      // Max 1 image per section
      if (analysis.images.length > 1) analysis.images = [analysis.images[0]];
      if (analysis.images.length === 0) analysis.needsImage = false;

      if (analysis.needsImage && analysis.images.length > 0) {
        console.log(`   ✅ 이미지 필요: ${analysis.images[0].method} (${analysis.images[0].type})`);
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
    console.log(`\n🚫 [${this.name}] 레거시 스톡 이미지 검색 비활성화`);
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
        return { imageUrl: result.url, revisedPrompt: result.revisedPrompt, source: result.source };
      } else {
        const fallback = this.dalle.generateSvgDiagram(prompt, type);
        return { imageUrl: fallback.url, revisedPrompt: prompt, source: fallback.source };
      }
    } catch (error: any) {
      console.error(`   ❌ 생성 오류: ${error.message}`);
      const fallback = this.dalle.generateSvgDiagram(prompt, type);
      return { imageUrl: fallback.url, revisedPrompt: prompt, source: fallback.source };
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
        if (imageSpec.method === 'brave-search') {
          // === Brave Search RAG Pipeline ===
          const bestImage = await this.braveSearch.findBestImage(section.title, content);
          
          if (bestImage) {
            curatedImages.push({
              type: 'web-image',
              position: imageSpec.position || 'top',
              caption: bestImage.caption || imageSpec.caption || imageSpec.description || '',
              description: imageSpec.description || bestImage.title || '',
              url: bestImage.url,
              thumb: bestImage.thumbnail,
              alt: bestImage.caption || imageSpec.description || section.title,
              credit: `출처: ${new URL(bestImage.sourceUrl || bestImage.source).hostname}`,
              source: 'brave-search'
            });
            console.log(`   ✅ Brave 이미지 채택 (score: ${bestImage.relevanceScore})`);
            continue;
          }

          // Brave 실패 → SVG fallback
          console.log(`   ↩️ Brave 이미지 없음 → SVG 다이어그램 fallback`);
          const prompt = imageSpec.generatePrompt || imageSpec.description || section.title;
          const diagramType = this._mapTypeToDiagramType(imageSpec.type);
          const genResult = await this.generateImage(prompt, diagramType);
          if (genResult.imageUrl) {
            curatedImages.push({
              type: imageSpec.type || 'diagram',
              position: imageSpec.position || 'top',
              caption: imageSpec.caption || imageSpec.description || '',
              description: imageSpec.description || '',
              url: genResult.imageUrl,
              thumb: genResult.imageUrl,
              alt: imageSpec.description || section.title,
              credit: genResult.source === 'dalle-3' ? 'Generated by DALL-E 3' : 'SVG Diagram',
              source: genResult.source || 'generated'
            });
          }
        } else {
          // === Generate (SVG diagram) ===
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
      }
    }

    return { images: curatedImages, totalTokens: tokens };
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
      'brave-search': 'architecture',
      'web-image': 'architecture',
    };
    return mapping[type] || 'default';
  }

  async batchCurateImages(sections: Array<{ id?: string; title: string }>, contents: string[]): Promise<CurationResult[]> {
    const braveStatus = this.braveSearch.isAvailable() ? '🌐 Brave RAG 활성' : '📐 SVG only';
    console.log(`\n🖼️  [${this.name}] ${sections.length}개 섹션 이미지 큐레이션 시작 (${braveStatus}, 최대 8개)...`);

    const results: CurationResult[] = [];
    let totalImageCount = 0;
    const MAX_DOCUMENT_IMAGES = 8;

    for (let i = 0; i < sections.length; i++) {
      if (totalImageCount >= MAX_DOCUMENT_IMAGES) {
        results.push({ sectionId: sections[i].id || sections[i].title, images: [] });
        continue;
      }

      const result = await this.curateImagesForSection(sections[i], contents[i]);
      totalImageCount += result.images.length;

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

    console.log(`\n   ✅ 큐레이션 완료: 총 ${totalImageCount}개 이미지 (최대 ${MAX_DOCUMENT_IMAGES}개)`);
    
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
