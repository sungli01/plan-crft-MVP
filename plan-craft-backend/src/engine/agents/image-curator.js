/**
 * Image Curator Agent (이미지 큐레이터 에이전트)
 * 
 * 역할:
 * - RAG 기반 이미지 검색
 * - 이미지 생성 필요성 판단
 * - 이미지 배치 최적화
 * - 캡션 작성
 */

import Anthropic from '@anthropic-ai/sdk';
import { UnsplashService } from '../services/unsplash.js';
import { DalleService } from '../services/dalle.js';

export class ImageCuratorAgent {
  constructor(apiKey, config = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-opus-4-6';
    this.name = 'ImageCurator';
    this.role = '이미지 큐레이터';
    
    // 이미지 서비스 초기화
    this.unsplash = new UnsplashService(config.unsplashKey);
    this.dalle = new DalleService(config.openaiKey);
  }

  async analyzeImageNeeds(section, content) {
    console.log(`\n🖼️  [${this.name}] 이미지 필요성 분석: ${section.title}`);

    const prompt = `# 섹션 정보
제목: ${section.title}

# 내용
${content}

# 임무
위 섹션에 필요한 이미지를 분석하세요.

1. **이미지 필요 여부 판단**
   - 필요함 / 불필요함

2. **이미지 타입 결정**
   - diagram: 도식도, 아키텍처
   - flowchart: 순서도, 프로세스
   - chart: 그래프, 차트
   - photo: 참고 사진
   - icon: 아이콘, 심볼
   - table: 표, 매트릭스 (시각화)

3. **이미지 검색 vs 생성**
   - search: 기존 이미지 검색으로 충분
   - generate: AI 생성 필요 (도식도, 순서도 등)

4. **배치 위치**
   - top: 섹션 상단
   - middle: 섹션 중간
   - bottom: 섹션 하단
   - multiple: 여러 위치

5. **검색 키워드** (검색 필요 시)

6. **생성 프롬프트** (생성 필요 시)

# 출력 형식
JSON 형식으로 출력하세요:

{
  "needsImage": true,
  "images": [
    {
      "type": "diagram",
      "method": "generate",
      "position": "top",
      "description": "전체 시스템 아키텍처",
      "generatePrompt": "A professional system architecture diagram showing...",
      "caption": "그림 1. 전체 시스템 아키텍처"
    }
  ]
}`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = message.content[0].text;
      let jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const analysis = JSON.parse(jsonStr);

      if (analysis.needsImage) {
        console.log(`   ✅ 이미지 ${analysis.images.length}개 필요`);
        analysis.images.forEach((img, i) => {
          console.log(`      ${i + 1}. ${img.type} (${img.method})`);
        });
      } else {
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
        console.log(`   ✅ ${results.length}개 이미지 찾음`);
        return {
          images: results,
          source: results[0].source
        };
      } else {
        console.log(`   ℹ️  검색 결과 없음`);
        return { images: [] };
      }

    } catch (error) {
      console.error(`   ❌ 검색 오류: ${error.message}`);
      return { images: [], error: error.message };
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
        console.log(`   ⚠️  생성 실패`);
        return { imageUrl: null };
      }

    } catch (error) {
      console.error(`   ❌ 생성 오류: ${error.message}`);
      return { imageUrl: null, error: error.message };
    }
  }

  async curateImagesForSection(section, content) {
    // 1. 이미지 필요성 분석
    const { analysis } = await this.analyzeImageNeeds(section, content);

    if (!analysis.needsImage) {
      return { images: [] };
    }

    // 2. 이미지 검색 또는 생성
    const curatedImages = [];

    for (const imageSpec of analysis.images) {
      if (imageSpec.method === 'search' && imageSpec.searchKeywords) {
        const searchResult = await this.searchImages(imageSpec.searchKeywords);
        if (searchResult.images.length > 0) {
          curatedImages.push({
            ...imageSpec,
            url: searchResult.images[0],
            source: 'search'
          });
        }
      } else if (imageSpec.method === 'generate' && imageSpec.generatePrompt) {
        const generateResult = await this.generateImage(imageSpec.generatePrompt);
        if (generateResult.imageUrl) {
          curatedImages.push({
            ...imageSpec,
            url: generateResult.imageUrl,
            source: 'generated'
          });
        }
      }
    }

    return {
      images: curatedImages,
      totalTokens: analysis.tokens
    };
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
    console.log(`   ✅ 큐레이션 완료: 총 ${totalImages}개 이미지`);

    return results;
  }
}
