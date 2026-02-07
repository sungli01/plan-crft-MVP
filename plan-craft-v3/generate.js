#!/usr/bin/env node
/**
 * Plan-Craft v3.0 - 고품질 문서 생성 엔진
 * 
 * 특징:
 * - 명확한 계층 구조 (대/중/소제목 + 본문)
 * - 개조식 표현 (번호, 불릿 포인트)
 * - Claude Opus 4 사용
 * - 품질 검증 시스템
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';

const CONFIG = {
  model: 'claude-opus-4-20250514',
  maxTokensPerSection: 8000,
  temperature: 0.7,
  delayBetweenRequests: 3000,
  outputDir: './output',
  progressDir: './progress'
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌ 오류: ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================================================
// 문서 구조 정의 (개조식 + 계층 구조)
// ============================================================================

const DOCUMENT_STRUCTURE = {
  title: 'AI 기반 스마트 물류 플랫폼 사업계획서',
  sections: [
    {
      id: 1,
      level: 1,
      title: '1. 연구개발 과제 개요',
      subsections: [
        {
          id: '1.1',
          level: 2,
          title: '1.1 과제명 및 주관기관',
          structure: {
            requirements: [
              '과제명을 명확하고 간결하게 제시',
              '주관기관의 핵심 역량과 프로젝트 적합성 입증',
              '기관 소개는 객관적 수치와 실적 중심'
            ],
            format: '개조식 (번호 + 불릿 포인트 혼용)',
            minItems: 5
          }
        },
        {
          id: '1.2',
          level: 2,
          title: '1.2 연구 필요성 및 목적',
          structure: {
            requirements: [
              '문제 상황을 구체적 데이터로 제시',
              '연구 필요성을 3단계 논리로 전개 (현황→문제→해결)',
              '연구 목적을 SMART 원칙에 따라 기술'
            ],
            format: '계층적 번호 체계 (1.2.1, 1.2.2...)',
            minItems: 6
          }
        },
        {
          id: '1.3',
          level: 2,
          title: '1.3 기대효과 및 성과목표',
          structure: {
            requirements: [
              '정량적 목표를 구체적 수치로 제시',
              '기대효과를 경제적/기술적/사회적 관점으로 분류',
              '각 목표에 대한 측정 방법 명시'
            ],
            format: '표 형식 + 개조식 설명',
            minItems: 5
          }
        }
      ]
    },
    {
      id: 2,
      level: 1,
      title: '2. 사업 추진 배경 및 환경 분석',
      subsections: [
        {
          id: '2.1',
          level: 2,
          title: '2.1 국내외 기술 동향',
          structure: {
            requirements: [
              '국내외 최신 연구 사례 5건 이상 분석',
              '각 사례별 핵심 기술과 성과 요약',
              '본 과제와의 차별점 명확히 제시'
            ],
            format: '표 형식 + 상세 개조식 설명',
            minItems: 8
          }
        },
        {
          id: '2.2',
          level: 2,
          title: '2.2 시장 현황 및 전망',
          structure: {
            requirements: [
              '시장 규모를 연도별 수치로 제시',
              '성장 전망을 신뢰할 수 있는 출처 인용',
              '주요 플레이어와 시장 점유율 분석'
            ],
            format: '그래프 설명 + 개조식',
            minItems: 6
          }
        },
        {
          id: '2.3',
          level: 2,
          title: '2.3 SWOT 분석 및 전략 도출',
          structure: {
            requirements: [
              'SWOT 각 항목별 3개 이상 요소',
              '각 요소의 근거와 영향도 분석',
              'SWOT 기반 전략 매트릭스 제시 (SO, WO, ST, WT)'
            ],
            format: '매트릭스 표 + 전략 개조식',
            minItems: 7
          }
        }
      ]
    },
    {
      id: 3,
      level: 1,
      title: '3. 연구개발 내용 및 방법',
      subsections: [
        {
          id: '3.1',
          level: 2,
          title: '3.1 연구개발 목표 및 세부 내용',
          structure: {
            requirements: [
              '최종 목표와 단계별 목표를 계층적으로 제시',
              '각 목표의 달성 기준(KPI) 명시',
              '세부 연구 내용을 WBS 구조로 전개'
            ],
            format: '계층적 번호 + 표',
            minItems: 10
          }
        },
        {
          id: '3.2',
          level: 2,
          title: '3.2 기술 아키텍처 및 시스템 설계',
          structure: {
            requirements: [
              '전체 시스템 구성도 설명 (아키텍처 다이어그램)',
              '핵심 모듈별 상세 설계 (입출력, 처리 로직)',
              '기술 스택과 선정 이유'
            ],
            format: '다이어그램 설명 + 상세 개조식',
            minItems: 8
          }
        },
        {
          id: '3.3',
          level: 2,
          title: '3.3 연구개발 방법론 및 절차',
          structure: {
            requirements: [
              '연구 방법을 단계별로 상세 기술',
              '각 단계의 산출물과 검증 방법',
              '연구 일정 (Gantt Chart 설명)'
            ],
            format: '순서도 + 개조식',
            minItems: 7
          }
        }
      ]
    }
  ]
};

// ============================================================================
// 고품질 프롬프트 생성
// ============================================================================

function generateSystemPrompt() {
  return `당신은 국가 R&D 사업계획서 작성 전문가입니다.

# 핵심 원칙

1. **계층 구조 준수**
   - 대제목(#) → 중제목(##) → 소제목(###) → 본문
   - 각 계층은 명확히 구분되어야 함

2. **개조식 표현**
   - 번호 매기기: 순서가 있는 내용
   - 불릿 포인트: 병렬적 나열
   - 혼용: 계층적 구조에서는 번호 + 불릿 조합

3. **논리적 전개**
   - 각 문단은 명확한 주제문으로 시작
   - 근거와 사례를 구체적으로 제시
   - 결론이나 시사점으로 마무리

4. **품질 기준**
   - 구체적 수치와 데이터 포함
   - 전문 용어는 정확하게 사용
   - 문장은 간결하고 명확하게
   - 중복 표현 제거

# 출력 형식

반드시 Markdown 형식을 사용하며, 다음 구조를 따릅니다:

## 중제목

### 소제목

1. **첫 번째 주요 항목**
   - 세부 사항 1
   - 세부 사항 2
   - 세부 사항 3

2. **두 번째 주요 항목**
   - 세부 사항 1
     - 더 상세한 내용
   - 세부 사항 2

본문 설명은 간결하고 명확하게 작성합니다. 각 문단은 2-3문장으로 제한하며, 핵심 내용만 담습니다.

**강조가 필요한 내용**은 볼드체를 사용하고, 중요 수치는 명확히 표기합니다.`;
}

function generateSectionPrompt(section, projectInfo) {
  const { title, idea } = projectInfo;
  
  return `# 작성 섹션: ${section.title}

## 프로젝트 정보
- **과제명**: ${title}
- **핵심 아이디어**: ${idea}

## 작성 요구사항

${section.structure.requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

## 형식 지침
- **기본 형식**: ${section.structure.format}
- **최소 항목 수**: ${section.structure.minItems}개 이상

## 작성 지침

1. **계층 구조를 명확히 하세요**
   - 제목(##) 다음에 소제목(###)
   - 각 소제목 아래 번호 매기기 또는 불릿 포인트

2. **개조식으로 작성하세요**
   - 각 항목은 간결하고 명확하게
   - 필요시 하위 항목으로 상세 설명
   - 표나 매트릭스가 필요하면 Markdown 테이블 사용

3. **구체성을 유지하세요**
   - 추상적 표현 대신 구체적 수치
   - 일반론 대신 프로젝트 맞춤 내용
   - "예를 들어" 등으로 실제 사례 제시

4. **품질을 검증하세요**
   - 각 항목이 최소 2-3줄 설명 포함
   - 논리적 흐름이 자연스러운지 확인
   - 중복 내용 제거

위 지침에 따라 **${section.title}** 섹션을 작성해주세요.

반드시 Markdown 형식으로 출력하고, 계층 구조와 개조식을 정확히 따라주세요.`;
}

// ============================================================================
// 품질 검증
// ============================================================================

function validateQuality(content, section) {
  const issues = [];
  
  // 1. 최소 길이 검증
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < section.structure.minItems) {
    issues.push(`항목 수 부족 (${lines.length}/${section.structure.minItems})`);
  }
  
  // 2. 계층 구조 검증
  const hasH2 = content.includes('##');
  const hasH3 = content.includes('###');
  if (!hasH2 && !hasH3) {
    issues.push('계층 구조(##, ###) 없음');
  }
  
  // 3. 개조식 검증
  const hasBullets = content.includes('- ') || content.includes('* ');
  const hasNumbers = /^\d+\./m.test(content);
  if (!hasBullets && !hasNumbers) {
    issues.push('개조식(번호/불릿) 없음');
  }
  
  // 4. 볼드체 사용 검증
  const hasBold = content.includes('**');
  if (!hasBold) {
    issues.push('강조(**) 미사용');
  }
  
  return {
    isValid: issues.length === 0,
    issues: issues,
    score: Math.max(0, 100 - (issues.length * 25))
  };
}

// ============================================================================
// 섹션 생성
// ============================================================================

async function generateSection(section, projectInfo) {
  console.log(`\n📝 섹션 생성 중: ${section.title}`);
  
  const systemPrompt = generateSystemPrompt();
  const userPrompt = generateSectionPrompt(section, projectInfo);
  
  try {
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokensPerSection,
      temperature: CONFIG.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });
    
    const content = message.content[0].text;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // 품질 검증
    const quality = validateQuality(content, section);
    
    console.log(`   ✅ 완료 (${duration}초)`);
    console.log(`   📊 품질 점수: ${quality.score}/100`);
    
    if (!quality.isValid) {
      console.log(`   ⚠️  품질 이슈: ${quality.issues.join(', ')}`);
    }
    
    return {
      section: section,
      content: content,
      quality: quality,
      tokens: message.usage,
      duration: parseFloat(duration),
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`   ❌ 오류: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// HTML 생성
// ============================================================================

function generateHTML(projectInfo, sections) {
  const totalQuality = sections.reduce((sum, s) => sum + s.quality.score, 0) / sections.length;
  
  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${projectInfo.title} - 사업계획서 v3.0</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.9;
      color: #222;
      max-width: 210mm;
      margin: 0 auto;
      padding: 30px;
      background: #fff;
    }
    
    /* 제목 스타일 */
    h1 {
      color: #1a1a1a;
      font-size: 28pt;
      font-weight: 700;
      margin: 40px 0 20px 0;
      padding-bottom: 12px;
      border-bottom: 3px solid #2563eb;
    }
    
    h2 {
      color: #2c3e50;
      font-size: 20pt;
      font-weight: 600;
      margin: 30px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #3b82f6;
    }
    
    h3 {
      color: #475569;
      font-size: 16pt;
      font-weight: 600;
      margin: 24px 0 12px 0;
      padding-left: 12px;
      border-left: 4px solid #60a5fa;
    }
    
    h4 {
      color: #64748b;
      font-size: 14pt;
      font-weight: 600;
      margin: 18px 0 10px 0;
    }
    
    /* 본문 스타일 */
    p {
      margin: 10px 0;
      text-align: justify;
      line-height: 1.8;
    }
    
    /* 리스트 스타일 */
    ul, ol {
      margin: 12px 0;
      padding-left: 30px;
    }
    
    li {
      margin: 8px 0;
      line-height: 1.7;
    }
    
    li > ul, li > ol {
      margin: 6px 0;
    }
    
    /* 강조 스타일 */
    strong {
      color: #1e40af;
      font-weight: 600;
    }
    
    /* 표 스타일 */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 11pt;
    }
    
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px;
      text-align: left;
    }
    
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    
    /* 커버 페이지 */
    .cover {
      text-align: center;
      padding: 100px 0;
      page-break-after: always;
    }
    
    .cover h1 {
      font-size: 36pt;
      color: #1e3a8a;
      border: none;
      margin-bottom: 40px;
    }
    
    .cover .subtitle {
      font-size: 20pt;
      color: #64748b;
      margin: 20px 0;
    }
    
    .stats {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      padding: 24px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 5px solid #2563eb;
    }
    
    .stats h3 {
      color: #1e40af;
      border: none;
      padding: 0;
      margin-bottom: 16px;
    }
    
    .section {
      page-break-inside: avoid;
      margin-bottom: 40px;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Consolas', monospace;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${projectInfo.title}</h1>
    <div class="subtitle">국가 R&D 과제 사업계획서</div>
    <div class="subtitle">Plan-Craft v3.0 (고품질 버전)</div>
    <div class="subtitle" style="margin-top: 50px;">${new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</div>
    <div class="stats">
      <h3>📊 문서 정보</h3>
      <p><strong>총 섹션:</strong> ${sections.length}개</p>
      <p><strong>평균 품질 점수:</strong> ${totalQuality.toFixed(1)}/100</p>
      <p><strong>생성 엔진:</strong> Plan-Craft v3.0 (Claude Opus 4)</p>
      <p><strong>문서 특징:</strong> 계층 구조 + 개조식 표현</p>
    </div>
  </div>

  <div class="page-break">
    <h2>프로젝트 개요</h2>
    <p><strong>과제명:</strong> ${projectInfo.title}</p>
    <p><strong>핵심 아이디어:</strong> ${projectInfo.idea}</p>
  </div>

  <div class="page-break">
    <h2>목차</h2>
    <ol>
`;

  sections.forEach((s, idx) => {
    html += `      <li>${s.section.title} (품질: ${s.quality.score}/100)</li>\n`;
  });

  html += `    </ol>
  </div>
`;

  sections.forEach((s) => {
    html += `  <div class="section page-break">
    <h1>${s.section.title}</h1>
${s.content}
  </div>\n\n`;
  });

  html += `</body>\n</html>`;
  return html;
}

// ============================================================================
// 메인 함수
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Plan-Craft v3.0 - 고품질 문서 생성 엔진               ║');
  console.log('║  - 계층 구조 + 개조식 표현                             ║');
  console.log('║  - Claude Opus 4 기반                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const projectInfo = {
    title: process.argv[2] || 'AI 기반 스마트 물류 플랫폼',
    idea: process.argv[3] || 'AI와 IoT를 활용하여 물류 배송을 최적화하고, 실시간 추적 및 예측 배송 시스템을 구축하는 혁신적인 플랫폼입니다. 블록체인 기반 투명한 이력 관리와 머신러닝 기반 수요 예측으로 물류 비용을 30% 절감합니다.'
  };

  console.log(`📋 프로젝트: ${projectInfo.title}`);
  console.log(`🤖 사용 모델: ${CONFIG.model}\n`);

  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  await fs.mkdir(CONFIG.progressDir, { recursive: true });

  const generatedSections = [];
  const startTime = Date.now();

  // 첫 번째 대섹션만 테스트 생성
  const section = DOCUMENT_STRUCTURE.sections[0];
  
  for (const subsection of section.subsections) {
    const result = await generateSection(subsection, projectInfo);
    generatedSections.push(result);
    
    // 저장
    const filename = `${CONFIG.progressDir}/section_${subsection.id.replace('.', '_')}.json`;
    await fs.writeFile(filename, JSON.stringify(result, null, 2), 'utf8');
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
  }

  // HTML 생성
  console.log('\n📝 HTML 문서 생성 중...');
  const html = generateHTML(projectInfo, generatedSections);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const htmlFile = `${CONFIG.outputDir}/${projectInfo.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_v3_${timestamp}.html`;
  
  await fs.writeFile(htmlFile, html, 'utf8');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgQuality = generatedSections.reduce((sum, s) => sum + s.quality.score, 0) / generatedSections.length;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ 문서 생성 완료!                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📁 파일: ${htmlFile}`);
  console.log(`📊 평균 품질: ${avgQuality.toFixed(1)}/100`);
  console.log(`📝 생성 섹션: ${generatedSections.length}개`);
  console.log(`⏱️  소요 시간: ${totalTime}초`);
}

main().catch(console.error);
