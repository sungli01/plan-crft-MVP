/**
 * DALL-E 3 이미지 생성 서비스
 */

export class DalleService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async generateImage(prompt, options = {}) {
    const {
      size = '1024x1024',
      quality = 'standard',
      style = 'natural'
    } = options;

    if (!this.apiKey) {
      console.log('⚠️  OpenAI API 키 없음 - 모의 데이터 반환');
      return this.getMockImage(prompt);
    }

    try {
      console.log(`🎨 DALL-E 3 이미지 생성 중...`);
      console.log(`   프롬프트: ${prompt.slice(0, 100)}...`);

      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size,
          quality,
          style
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DALL-E API 오류: ${error.error?.message || response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;
      const revisedPrompt = data.data[0].revised_prompt;

      console.log(`   ✅ 생성 완료`);

      return {
        url: imageUrl,
        revisedPrompt,
        source: 'dalle-3',
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`   ❌ 생성 오류: ${error.message}`);
      return this.getMockImage(prompt);
    }
  }

  async generateDiagram(description, type = 'architecture') {
    const diagramPrompts = {
      architecture: `Professional system architecture diagram showing ${description}. Clean, minimal design with boxes, arrows, and labels. Technical illustration style.`,
      flowchart: `Professional flowchart diagram for ${description}. Clear flow with decision points, processes, and connectors. Business process style.`,
      chart: `Professional data visualization chart showing ${description}. Clean graph or chart with clear labels and legend. Infographic style.`,
      workflow: `Professional workflow diagram illustrating ${description}. Sequential steps with clear connections. Process flow style.`
    };

    const prompt = diagramPrompts[type] || diagramPrompts.architecture;

    return this.generateImage(prompt, {
      size: '1792x1024', // 와이드 스크린
      quality: 'hd',
      style: 'natural'
    });
  }

  getMockImage(prompt) {
    // 모의 데이터 (개발/테스트용)
    const seed = Math.floor(Math.random() * 10000);
    return {
      url: `https://picsum.photos/seed/${seed}/1024/1024`,
      revisedPrompt: prompt,
      source: 'mock',
      generatedAt: new Date().toISOString()
    };
  }
}
