#!/usr/bin/env node
/**
 * Plan-Craft v2.0 - 테스트 버전 (3개 섹션만)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY 필요');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// 테스트용 3개 섹션
const SECTIONS = [
  {
    id: 1,
    title: '1. 연구개발 과제 개요',
    targetPages: 5,
    targetWords: 2500,
    prompt: `과제명, 주관기관, 연구 목표, 필요성, 기대효과를 포함한 연구개발 과제의 전체 개요를 작성하세요. 
    구체적인 목표와 명확한 성과지표를 포함해야 합니다. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 2,
    title: '2. 사업 추진 배경',
    targetPages: 8,
    targetWords: 4000,
    prompt: `기술 동향, 시장 현황, 정책 분석, SWOT 분석, 경쟁 환경 분석을 포함하여 사업 추진 배경을 작성하세요.
    국내외 시장 규모, 성장률, 주요 플레이어 분석을 포함해야 합니다. 최소 4000단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 3,
    title: '3. 연구개발 목표 및 성과지표',
    targetPages: 7,
    targetWords: 3500,
    prompt: `최종 목표, 단계별 세부 목표, 정량적 KPI, 정성적 평가 방법을 작성하세요.
    각 목표에 대한 측정 가능한 지표와 검증 방법을 포함해야 합니다. 최소 3500단어 이상으로 상세히 작성하세요.`
  }
];

async function generateSection(section, projectName, projectIdea) {
  console.log(`\n🤖 ${section.title} 생성 중...`);

  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 4096,
    system: '당신은 전문적인 사업계획서 작성 전문가입니다.',
    messages: [{
      role: 'user',
      content: `프로젝트: ${projectName}
아이디어: ${projectIdea}

${section.title}에 대한 내용을 작성하세요.

${section.prompt}

Markdown 형식으로 작성하세요.`
    }]
  });

  const content = message.content[0].text;
  const wordCount = content.split(/\s+/).length;

  console.log(`   ✅ 완료: ${wordCount}단어`);

  return { section, content, wordCount };
}

function generateHTML(projectName, sections) {
  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const totalPages = Math.ceil(totalWords / 500);

  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${projectName} - 테스트</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.8; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .stats { background: #ecf0f1; padding: 20px; border-radius: 10px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${projectName} - 사업계획서 (테스트)</h1>
  
  <div class="stats">
    <h3>📊 문서 정보</h3>
    <p><strong>총 페이지:</strong> 약 ${totalPages}페이지</p>
    <p><strong>총 단어:</strong> ${totalWords.toLocaleString()}단어</p>
    <p><strong>섹션:</strong> ${sections.length}개</p>
  </div>
`;

  sections.forEach(s => {
    html += `\n  <div>\n    <h1>${s.section.title}</h1>\n    ${s.content}\n  </div>\n`;
  });

  html += '\n</body>\n</html>';
  return html;
}

async function main() {
  console.log('🧪 Plan-Craft v2.0 - 테스트 (3개 섹션)\n');

  const projectName = 'AI 기반 스마트 물류 플랫폼';
  const projectIdea = 'AI와 IoT를 활용한 물류 최적화 플랫폼';

  const results = [];
  
  for (const section of SECTIONS) {
    const result = await generateSection(section, projectName, projectIdea);
    results.push(result);
    await new Promise(r => setTimeout(r, 2000)); // 2초 대기
  }

  const html = generateHTML(projectName, results);
  await fs.mkdir('./output', { recursive: true });
  await fs.writeFile('./output/test.html', html, 'utf8');

  const totalWords = results.reduce((sum, s) => sum + s.wordCount, 0);

  console.log('\n✅ 완료!');
  console.log(`📁 output/test.html`);
  console.log(`📝 ${totalWords}단어 (약 ${Math.ceil(totalWords / 500)}페이지)`);
}

main().catch(console.error);
