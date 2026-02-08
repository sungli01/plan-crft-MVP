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
    return `이미지 큐레이터. 섹션별 이미지 필요성 분석.
타입: diagram/flowchart/chart/photo/icon/table
방법: search(사진) / generate(도식도,차트)
위치: top/middle/bottom
순수 JSON 출력:
{"needsImage":true,"images":[{"type":"diagram","method":"generate","position":"top","description":"","searchKeywords":"","generatePrompt":"","caption":""}]}`;
  }

  async analyzeImageNeeds(section: { title: string }, content: string): Promise<{ analysis: ImageAnalysis; tokens?: any }> {
    console.log(`\n🖼️  [${this.name}] 이미지 필요성 분석: ${section.title}`);

    const contentSnippet = content?.length > 200
      ? content.slice(0, 200) + '…'
      : (content || '');

    const userPrompt = `제목: ${section.title}\n내용: ${contentSnippet}`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.3,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: userPrompt }]
      });

      const responseText = (message.content[0] as any).text;
      let jsonStr = responseText.match(/```json\n?([\s\S]*?)\n?```/)?.[1] || responseText;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      jsonStr = jsonStr.trim();
      
      const analysis: ImageAnalysis = JSON.parse(jsonStr);

      if (analysis.needsImage && analysis.images && analysis.images.length > 0) {
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
      console.error(`   ❌ 분석 오류: ${error.message}`);
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
