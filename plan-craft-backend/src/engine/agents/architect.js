/**
 * Architect Agent (설계자 에이전트)
 * 
 * 역할:
 * - 문서 전체 구조 설계
 * - 섹션 분할 및 우선순위 결정
 * - 이미지 필요 영역 식별
 * - 작업 계획 수립
 */

import Anthropic from '@anthropic-ai/sdk';

export class ArchitectAgent {
  constructor(apiKey, config = {}) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = config.model || 'claude-opus-4-6';
    this.name = 'Architect';
    this.role = '문서 설계자';
  }

  async designStructure(projectInfo) {
    console.log(`\n📐 [${this.name}] 문서 구조 설계 시작...`);

    const prompt = `사업계획서 구조 설계 전문가. 25개 섹션 구성.

과제: ${projectInfo.title}
아이디어: ${projectInfo.idea}

JSON 형식으로 출력:
{
  "structure": [
    {"title": "대제목", "subsections": [
      {"id": "s1", "title": "중제목", "level": 2, "estimatedWords": 800}
    ]}
  ]
}

출력:
JSON 형식으로 출력하되, 마크다운 코드 블록 없이 순수 JSON만 출력하세요.

\`\`\`json
{
  "documentTitle": "문서 제목",
  "structure": [
    {
      "level": 1,
      "title": "1. 대제목",
      "priority": "high",
      "subsections": [
        {
          "level": 2,
          "title": "1.1 중제목",
          "needsImage": true,
          "imageType": "diagram",
          "subsections": [
            {
              "level": 3,
              "title": "1.1.1 소제목",
              "estimatedWords": 500
            }
          ]
        }
      ]
    }
  ],
  "imageRequirements": [
    {
      "sectionId": "1.1",
      "type": "diagram",
      "description": "전체 시스템 아키텍처 다이어그램"
    }
  ],
  "estimatedTotalPages": 200
}
\`\`\``;

    try {
      const message = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = message.content[0].text;
      
      // JSON 추출 (코드 블록 제거)
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      } else if (content.includes('```')) {
        jsonStr = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
      }
      
      const design = JSON.parse(jsonStr);

      console.log(`   ✅ 설계 완료`);
      console.log(`   📊 대제목: ${design.structure.length}개`);
      console.log(`   🖼️  이미지 필요: ${design.imageRequirements?.length || 0}개`);
      console.log(`   📄 예상 페이지: ${design.estimatedTotalPages}페이지`);

      return {
        design,
        tokens: message.usage,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`   ❌ 오류: ${error.message}`);
      throw error;
    }
  }

  async refineStructure(design, feedback) {
    console.log(`\n📐 [${this.name}] 구조 개선 중...`);

    const prompt = `# 기존 설계
${JSON.stringify(design, null, 2)}

# 피드백
${feedback}

위 피드백을 반영하여 구조를 개선하세요. JSON 형식으로 출력하세요.`;

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0].text;
    let jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
    const refinedDesign = JSON.parse(jsonStr);

    console.log(`   ✅ 개선 완료`);

    return {
      design: refinedDesign,
      tokens: message.usage
    };
  }
}
