/**
 * Image Curator Agent (이미지 큐레이터 에이전트)
 * 
 * 역할:
 * - RAG 기반 이미지 검색
 * - 이미지 생성 필요성 판단
 * - 이미지 배치 최적화
 * - 캡션 작성
 * 
 * Fallback chain:
 * - Search: Unsplash API → Picsum Photos → SVG placeholder
 * - Generate: DALL-E 3 → Professional SVG diagrams
 */

import Anthropic from '@anthropic-ai/sdk';
import { UnsplashService } from '../services/unsplash.js';
import { DalleService } from '../services/dalle.js';

export class ImageCuratorAgent {
  constructor(apiKey, config = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-3-5-haiku-20241022'; // Haiku: sufficient for image keyword extraction
    this.name = 'ImageCurator';
    this.role = '이미지 큐레이터';
    
    // 이미지 서비스 초기화
    this.unsplash = new UnsplashService(config.unsplashKey);
    this.dalle = new DalleService(config.openaiKey);
  }

  /**
   * Static system prompt for image analysis — cached by Anthropic
   */
  getSystemPrompt() {
    return `이미지 큐레이터. 섹션별 이미지 필요성 분석.
타입: diagram/flowchart/chart/photo/icon/table
방법: search(사진) / generate(도식도,차트)
위치: top/middle/bottom
순수 JSON 출력:
{"needsImage":true,"images":[{"type":"diagram","method":"generate","position":"top","description":"","searchKeywords":"","generatePrompt":"","caption":""}]}`;
  }

  async analyzeImageNeeds(section, content) {
    console.log(`\n🖼️  [${this.name}] 이미지 필요성 분석: ${section.title}`);

    // Compressed: section title + first 200 chars of content (enough for image decision)
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

      const responseText = message.content[0].text;
      let jsonStr = responseText.match(/```json\n?([\s\S]*?)\n?```/)?.[1] || responseText;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      // Trim whitespace that might cause parse errors
      jsonStr = jsonStr.trim();
      
      const analysis = JSON.parse(jsonStr);

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

    } catch (error) {
      console.error(`   ❌ 분석 오류: ${error.message}`);
      return {
        analysis: { needsImage: false, images: [] },
        error: error.message
      };
    }
  }

  async searchImages(keywords, count = 3) {
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

    } catch (error) {
      console.error(`   ❌ 검색 오류: ${error.message}`);
      // Last resort: SVG placeholder
      const placeholder = this.unsplash.generateSvgPlaceholder(keywords);
      return { images: [placeholder], source: 'svg-placeholder' };
    }
  }

  async generateImage(prompt, type = 'architecture') {
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

    } catch (error) {
      console.error(`   ❌ 생성 오류: ${error.message}`);
      // Fallback to SVG
      const fallback = this.dalle.generateSvgDiagram(prompt, type);
      return {
        imageUrl: fallback.url,
        revisedPrompt: prompt,
        source: fallback.source
      };
    }
  }

  async curateImagesForSection(section, content) {
    // 1. 이미지 필요성 분석
    const { analysis, tokens } = await this.analyzeImageNeeds(section, content);

    if (!analysis.needsImage || !analysis.images || analysis.images.length === 0) {
      return { images: [], totalTokens: tokens };
    }

    // 2. 이미지 검색 또는 생성
    const curatedImages = [];

    for (const imageSpec of analysis.images) {
      try {
        if (imageSpec.method === 'search') {
          // Use searchKeywords if available, fall back to description or section title
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
          // Use generatePrompt if available, fall back to description
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
      } catch (error) {
        console.error(`   ⚠️  이미지 처리 실패 (${imageSpec.type}): ${error.message}`);
        // Still provide an SVG placeholder so sections aren't empty
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

  /**
   * Map image types from LLM analysis to DALL-E diagram types
   */
  _mapTypeToDiagramType(type) {
    const mapping = {
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

  async batchCurateImages(sections, contents) {
    console.log(`\n🖼️  [${this.name}] ${sections.length}개 섹션 이미지 큐레이션 시작...`);

    const results = [];

    for (let i = 0; i < sections.length; i++) {
      const result = await this.curateImagesForSection(sections[i], contents[i]);
      results.push({
        sectionId: sections[i].id || sections[i].title,
        ...result
      });

      // Rate limiting
      if (i < sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalImages = results.reduce((sum, r) => sum + r.images.length, 0);
    console.log(`\n   ✅ 큐레이션 완료: 총 ${totalImages}개 이미지`);
    
    // Log source breakdown
    const sourceCounts = {};
    results.forEach(r => r.images.forEach(img => {
      sourceCounts[img.source] = (sourceCounts[img.source] || 0) + 1;
    }));
    if (Object.keys(sourceCounts).length > 0) {
      console.log(`   📊 소스 분포: ${Object.entries(sourceCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    }

    return results;
  }
}
