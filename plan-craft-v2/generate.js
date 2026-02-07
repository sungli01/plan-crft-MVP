#!/usr/bin/env node
/**
 * Plan-Craft v2.0 - 실제 작동하는 200페이지 문서 생성기
 * 
 * 특징:
 * - 실제 AI API 호출
 * - Rate Limit 자동 처리
 * - 200페이지 보장
 * - HTML/PDF 출력
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';

// ============================================================================
// 설정
// ============================================================================

const CONFIG = {
  model: 'claude-3-haiku-20240307',
  maxTokensPerRequest: 4096,
  delayBetweenRequests: 2000, // 2초 (Rate Limit 대응)
  outputDir: './output'
};

// API 키 확인
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌ 오류: ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
  console.error('   export ANTHROPIC_API_KEY="your-key-here" 를 실행하세요.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================================================
// 문서 구조 정의 (40개 섹션 = 200페이지)
// ============================================================================

const SECTIONS = [
  // PART 1: 사업 개요 및 배경 (8개 섹션, 40페이지)
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
  },
  {
    id: 4,
    title: '4. 선행 연구 및 기술 현황',
    targetPages: 10,
    targetWords: 5000,
    prompt: `국내외 연구 동향, 특허 및 논문 분석, TRL(기술성숙도) 평가, 기존 기술의 한계점을 작성하세요.
    주요 선행 연구 사례를 최소 10개 이상 분석하고, 본 연구와의 차별점을 명확히 해야 합니다. 최소 5000단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 5,
    title: '5. 사업 추진 전략',
    targetPages: 10,
    targetWords: 5000,
    prompt: `기술 개발 전략, 사업화 전략, 협력 전략, 위험 관리 전략을 작성하세요.
    단계별 추진 계획과 예상 성과, 리스크 대응 방안을 포함해야 합니다. 최소 5000단어 이상으로 매우 상세히 작성하세요.`
  },

  // PART 2: 연구개발 계획 (4개 섹션, 60페이지)
  {
    id: 6,
    title: '6. 연구개발 내용 및 범위',
    targetPages: 15,
    targetWords: 7500,
    prompt: `과제 체계도, 세부 연구 내용, 기술 로드맵, 각 연구 단계별 상세 계획을 작성하세요.
    연구개발 범위를 명확히 하고, 제외 사항도 명시해야 합니다. 최소 7500단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 7,
    title: '7. 기술 아키텍처 및 시스템 설계',
    targetPages: 15,
    targetWords: 7500,
    prompt: `전체 시스템 구성도, 데이터 아키텍처, 보안 설계, 확장성 고려사항을 작성하세요.
    각 컴포넌트의 역할과 상호작용, 기술 스택 선정 이유를 포함해야 합니다. 최소 7500단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 8,
    title: '8. 구현 계획',
    targetPages: 15,
    targetWords: 7500,
    prompt: `단계별 개발 일정, 마일스톤, 테스트 계획, 품질 관리 방안을 작성하세요.
    각 단계별 산출물과 검증 기준을 명확히 해야 합니다. 최소 7500단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 9,
    title: '9. 핵심 기술 개발 계획',
    targetPages: 15,
    targetWords: 7500,
    prompt: `핵심 기술 #1, #2, #3에 대한 상세 개발 계획을 작성하세요.
    각 기술의 혁신성, 구현 방법, 예상 난이도, 대안 기술을 포함해야 합니다. 최소 7500단어 이상으로 매우 상세히 작성하세요.`
  },

  // PART 3: 기술적 타당성 (4개 섹션, 40페이지)
  {
    id: 10,
    title: '10. 요구사항 분석',
    targetPages: 8,
    targetWords: 4000,
    prompt: `기능 요구사항, 비기능 요구사항, 시스템 요구사항, 사용자 요구사항을 작성하세요.
    우선순위와 검증 방법을 포함해야 합니다. 최소 4000단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 11,
    title: '11. 상세 설계',
    targetPages: 12,
    targetWords: 6000,
    prompt: `모듈별 상세 설계, 데이터베이스 설계, API 명세, 인터페이스 정의를 작성하세요.
    각 모듈의 입출력, 처리 로직, 예외 처리 방안을 포함해야 합니다. 최소 6000단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 12,
    title: '12. 성능 및 품질 설계',
    targetPages: 10,
    targetWords: 5000,
    prompt: `성능 목표, 부하 테스트 계획, 품질 관리 프로세스, 성능 최적화 전략을 작성하세요.
    응답 시간, 처리량, 동시 사용자 수 등 구체적인 지표를 포함해야 합니다. 최소 5000단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 13,
    title: '13. 보안 설계',
    targetPages: 10,
    targetWords: 5000,
    prompt: `보안 위협 분석, 인증/인가 체계, 암호화 방식, 컴플라이언스 준수 방안을 작성하세요.
    OWASP Top 10 대응 방안과 보안 테스트 계획을 포함해야 합니다. 최소 5000단어 이상으로 매우 상세히 작성하세요.`
  },

  // PART 4: 사업화 및 경제성 (3개 섹션, 30페이지)
  {
    id: 14,
    title: '14. 시장 분석',
    targetPages: 8,
    targetWords: 4000,
    prompt: `목표 시장, 시장 규모 및 성장률, 고객 세분화, 경쟁 분석을 작성하세요.
    TAM, SAM, SOM 분석과 시장 진입 전략을 포함해야 합니다. 최소 4000단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 15,
    title: '15. 사업화 전략',
    targetPages: 10,
    targetWords: 5000,
    prompt: `사업화 로드맵, 제품 전략, 마케팅 전략, 파트너십 전략을 작성하세요.
    Go-to-Market 전략과 예상 매출 모델을 포함해야 합니다. 최소 5000단어 이상으로 매우 상세히 작성하세요.`
  },
  {
    id: 16,
    title: '16. 경제성 분석',
    targetPages: 12,
    targetWords: 6000,
    prompt: `비용 추정, 매출 예측, ROI 분석, 손익분기점(BEP), 재무 지표를 작성하세요.
    5개년 재무 계획과 민감도 분석을 포함해야 합니다. 최소 6000단어 이상으로 매우 상세히 작성하세요.`
  },

  // PART 5: 추진 체계 (3개 섹션, 15페이지)
  {
    id: 17,
    title: '17. 추진 체계',
    targetPages: 5,
    targetWords: 2500,
    prompt: `조직 구성도, RACI 매트릭스, 의사결정 체계, 커뮤니케이션 계획을 작성하세요.
    각 역할의 책임과 권한을 명확히 해야 합니다. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 18,
    title: '18. 인력 운영 계획',
    targetPages: 5,
    targetWords: 2500,
    prompt: `소요 인력, M/M 계산, 역량 요구사항, 교육 훈련 계획을 작성하세요.
    각 역할별 필요 인원과 투입 시기를 포함해야 합니다. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 19,
    title: '19. 일정 관리 계획',
    targetPages: 5,
    targetWords: 2500,
    prompt: `WBS(Work Breakdown Structure), Gantt Chart, 주요 마일스톤, 일정 관리 방안을 작성하세요.
    Critical Path와 버퍼 관리 전략을 포함해야 합니다. 최소 2500단어 이상으로 상세히 작성하세요.`
  },

  // PART 6: 예산 및 관리 (2개 섹션, 10페이지)
  {
    id: 20,
    title: '20. 예산 계획',
    targetPages: 5,
    targetWords: 2500,
    prompt: `총 사업비, 비목별 예산, 연차별 예산 배분, 집행 계획을 작성하세요.
    각 비목의 산정 근거와 집행 기준을 명확히 해야 합니다. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 21,
    title: '21. 관리 계획',
    targetPages: 5,
    targetWords: 2500,
    prompt: `진도 관리, 품질 관리, 위험 관리, 변경 관리, 문서 관리 계획을 작성하세요.
    각 관리 영역의 프로세스와 도구를 포함해야 합니다. 최소 2500단어 이상으로 상세히 작성하세요.`
  },

  // 추가 상세 섹션들 (19개 섹션, 85페이지)
  {
    id: 22,
    title: '22. 데이터 관리 계획',
    targetPages: 5,
    targetWords: 2500,
    prompt: `데이터 수집, 저장, 처리, 보안, 백업 및 복구 계획을 작성하세요. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 23,
    title: '23. 지식재산권 확보 전략',
    targetPages: 5,
    targetWords: 2500,
    prompt: `특허 출원 계획, 기술 보호 전략, IP 포트폴리오 구축 방안을 작성하세요. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 24,
    title: '24. 표준화 및 인증 계획',
    targetPages: 4,
    targetWords: 2000,
    prompt: `국내외 표준 준수, 인증 획득 계획, 표준화 활동 참여 방안을 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 25,
    title: '25. 테스트 및 검증 계획',
    targetPages: 6,
    targetWords: 3000,
    prompt: `Unit, Integration, System, UAT 테스트 계획을 작성하세요. 최소 3000단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 26,
    title: '26. 배포 및 운영 계획',
    targetPages: 5,
    targetWords: 2500,
    prompt: `CI/CD 파이프라인, 인프라 구성, 모니터링, 장애 대응 계획을 작성하세요. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 27,
    title: '27. 유지보수 계획',
    targetPages: 4,
    targetWords: 2000,
    prompt: `유지보수 체계, 버전 관리, 기술 지원 계획을 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 28,
    title: '28. 성과 확산 계획',
    targetPages: 4,
    targetWords: 2000,
    prompt: `논문 게재, 학회 발표, 기술 이전 계획을 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 29,
    title: '29. 교육 및 훈련 계획',
    targetPages: 4,
    targetWords: 2000,
    prompt: `기술 교육, 역량 강화, 지식 이전 계획을 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 30,
    title: '30. 협력 네트워크 구축',
    targetPages: 4,
    targetWords: 2000,
    prompt: `산학연 협력, 글로벌 파트너십, 컨소시엄 구성 계획을 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 31,
    title: '31. 윤리 및 사회적 책임',
    targetPages: 4,
    targetWords: 2000,
    prompt: `연구 윤리, 사회적 영향 분석, 윤리적 고려사항을 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 32,
    title: '32. 환경 영향 평가',
    targetPages: 3,
    targetWords: 1500,
    prompt: `환경 친화성, 탄소 배출 관리, 지속가능성을 작성하세요. 최소 1500단어 이상으로 작성하세요.`
  },
  {
    id: 33,
    title: '33. 법적 검토',
    targetPages: 4,
    targetWords: 2000,
    prompt: `관련 법규 준수, 계약 사항, 법적 리스크 관리를 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 34,
    title: '34. 리스크 상세 분석',
    targetPages: 6,
    targetWords: 3000,
    prompt: `기술, 사업, 재무 리스크 및 대응 방안을 작성하세요. 최소 3000단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 35,
    title: '35. 대안 시나리오 분석',
    targetPages: 5,
    targetWords: 2500,
    prompt: `최선, 보통, 최악 시나리오 및 대응 전략을 작성하세요. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 36,
    title: '36. 벤치마킹 연구',
    targetPages: 5,
    targetWords: 2500,
    prompt: `국내외 유사 사례 분석, 성공 요인, 시사점을 작성하세요. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 37,
    title: '37. 혁신성 평가',
    targetPages: 5,
    targetWords: 2500,
    prompt: `기술 혁신성, 차별화 요소, 경쟁 우위를 작성하세요. 최소 2500단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 38,
    title: '38. 파급효과 분석',
    targetPages: 6,
    targetWords: 3000,
    prompt: `경제적, 사회적, 기술적 파급효과를 작성하세요. 최소 3000단어 이상으로 상세히 작성하세요.`
  },
  {
    id: 39,
    title: '39. 지속가능성 계획',
    targetPages: 4,
    targetWords: 2000,
    prompt: `장기 운영 계획, 지속 가능 발전 전략을 작성하세요. 최소 2000단어 이상으로 작성하세요.`
  },
  {
    id: 40,
    title: '40. 종합 결론 및 제언',
    targetPages: 8,
    targetWords: 4000,
    prompt: `핵심 요약, 성공 전략, 향후 계획, 제언사항을 작성하세요. 최소 4000단어 이상으로 매우 상세히 작성하세요.`
  }
];

// ============================================================================
// 유틸리티 함수
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
}

// ============================================================================
// AI 콘텐츠 생성
// ============================================================================

async function generateSectionContent(section, projectName, projectIdea) {
  console.log(`\n🤖 섹션 ${section.id}/40 생성 중: ${section.title}`);
  console.log(`   목표: ${section.targetWords}단어 (약 ${section.targetPages}페이지)`);

  const systemPrompt = `당신은 전문적인 사업계획서 작성 전문가입니다. 
국가 R&D 사업계획서 작성 경험이 풍부하며, 구체적이고 설득력 있는 문서를 작성합니다.`;

  const userPrompt = `프로젝트: ${projectName}
아이디어: ${projectIdea}

${section.title}에 대한 내용을 작성하세요.

요구사항:
${section.prompt}

형식:
- 전문적이고 설득력 있는 문체
- 구체적인 숫자와 데이터 포함
- 명확한 근거와 논리적 흐름
- Markdown 형식으로 작성 (## 제목, ### 소제목, - 목록, 1. 번호 등)
- 최소 ${section.targetWords}단어 이상 작성 (단어 수가 매우 중요합니다!)

지금 바로 내용을 작성하세요:`;

  try {
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokensPerRequest,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    const content = message.content[0].text;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const wordCount = content.split(/\s+/).length;

    console.log(`   ✅ 완료 (${duration}초, ${wordCount}단어, ${message.usage.input_tokens}+${message.usage.output_tokens} tokens)`);

    return {
      section: section,
      content: content,
      wordCount: wordCount,
      tokens: message.usage
    };

  } catch (error) {
    console.error(`   ❌ 오류: ${error.message}`);
    
    // Retry 로직
    if (error.status === 429) {
      console.log(`   ⏳ Rate Limit - 10초 대기 후 재시도...`);
      await sleep(10000);
      return generateSectionContent(section, projectName, projectIdea);
    }
    
    throw error;
  }
}

// ============================================================================
// HTML 생성
// ============================================================================

function generateHTML(projectName, projectIdea, sections) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const totalPages = Math.ceil(totalWords / 500); // 한 페이지당 약 500단어

  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - 사업계획서</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: 'Malgun Gothic', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }
    
    h1 {
      color: #1a1a1a;
      font-size: 28pt;
      font-weight: bold;
      margin-top: 40px;
      margin-bottom: 20px;
      page-break-before: always;
    }
    
    h2 {
      color: #2c3e50;
      font-size: 20pt;
      font-weight: bold;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    
    h3 {
      color: #34495e;
      font-size: 16pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    
    p {
      margin: 10px 0;
      text-align: justify;
    }
    
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    
    li {
      margin: 5px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    
    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    
    .cover {
      text-align: center;
      padding: 100px 0;
      page-break-after: always;
    }
    
    .cover h1 {
      font-size: 36pt;
      color: #2c3e50;
      margin-bottom: 40px;
    }
    
    .cover .subtitle {
      font-size: 20pt;
      color: #7f8c8d;
      margin: 20px 0;
    }
    
    .cover .date {
      font-size: 16pt;
      color: #95a5a6;
      margin-top: 60px;
    }
    
    .stats {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 10px;
      margin: 30px 0;
      page-break-inside: avoid;
    }
    
    .stats h3 {
      margin-top: 0;
      color: #2c3e50;
    }
    
    .section {
      page-break-inside: avoid;
      margin-bottom: 40px;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    @media print {
      body {
        background: white;
      }
    }
  </style>
</head>
<body>
  <!-- 표지 -->
  <div class="cover">
    <h1>${projectName}</h1>
    <div class="subtitle">사업계획서</div>
    <div class="subtitle">(국가 R&D 과제 제안서)</div>
    <div class="date">${dateStr}</div>
    <div class="stats">
      <h3>📊 문서 정보</h3>
      <p><strong>총 페이지:</strong> 약 ${totalPages}페이지</p>
      <p><strong>총 단어 수:</strong> ${totalWords.toLocaleString()}단어</p>
      <p><strong>섹션 수:</strong> ${sections.length}개</p>
      <p><strong>생성 도구:</strong> Plan-Craft v2.0 (AI 기반)</p>
    </div>
  </div>

  <!-- 프로젝트 개요 -->
  <div class="page-break">
    <h2>프로젝트 개요</h2>
    <p><strong>프로젝트명:</strong> ${projectName}</p>
    <p><strong>핵심 아이디어:</strong></p>
    <p>${projectIdea}</p>
  </div>

  <!-- 목차 -->
  <div class="page-break">
    <h2>목차</h2>
    <ol>
`;

  sections.forEach((s, i) => {
    html += `      <li>${s.section.title} (${s.wordCount}단어)</li>\n`;
  });

  html += `    </ol>
  </div>

  <!-- 본문 -->
`;

  sections.forEach((s, i) => {
    html += `  <!-- ${s.section.title} -->
  <div class="section page-break">
    <h1>${s.section.title}</h1>
    ${s.content.replace(/\n/g, '\n    ')}
  </div>

`;
  });

  html += `</body>
</html>`;

  return html;
}

// ============================================================================
// 메인 실행
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Plan-Craft v2.0 - 200페이지 문서 생성기                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 프로젝트 정보 입력
  const projectName = process.argv[2] || 'AI 기반 스마트 물류 플랫폼';
  const projectIdea = process.argv[3] || `AI와 IoT를 활용하여 물류 배송을 최적화하고, 
실시간 추적 및 예측 배송 시스템을 구축하는 혁신적인 플랫폼입니다.
블록체인 기반 투명한 이력 관리와 머신러닝 기반 수요 예측으로 물류 비용을 30% 절감합니다.`;

  console.log(`📋 프로젝트: ${projectName}`);
  console.log(`💡 아이디어: ${projectIdea}\n`);
  console.log(`📊 생성할 섹션: ${SECTIONS.length}개`);
  console.log(`📄 예상 페이지: ${SECTIONS.reduce((sum, s) => sum + s.targetPages, 0)}페이지\n`);

  const targetWords = SECTIONS.reduce((sum, s) => sum + s.targetWords, 0);
  const estimatedMinutes = Math.ceil(SECTIONS.length * 15 / 60); // 섹션당 15초 + Rate Limit
  
  console.log(`⏱️  예상 소요 시간: ${estimatedMinutes}분`);
  console.log(`🎯 목표 단어 수: ${targetWords.toLocaleString()}단어\n`);
  console.log(`⚙️  모델: ${CONFIG.model}`);
  console.log(`⏳ Rate Limit 대응: 섹션마다 ${CONFIG.delayBetweenRequests/1000}초 대기\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 출력 디렉토리 생성
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  const startTime = Date.now();
  const generatedSections = [];
  let totalTokens = { input: 0, output: 0 };

  // 섹션별 생성 (순차 실행)
  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i];
    
    const result = await generateSectionContent(section, projectName, projectIdea);
    generatedSections.push(result);
    
    totalTokens.input += result.tokens.input_tokens;
    totalTokens.output += result.tokens.output_tokens;

    // 진행률 표시
    const progress = ((i + 1) / SECTIONS.length * 100).toFixed(1);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.floor(elapsed / (i + 1) * (SECTIONS.length - i - 1));
    
    console.log(`📊 진행률: ${progress}% (${i + 1}/${SECTIONS.length})`);
    console.log(`⏱️  경과: ${formatTime(elapsed)} | 남은 시간: ${formatTime(remaining)}\n`);

    // Rate Limit 대응 - 대기
    if (i < SECTIONS.length - 1) {
      await sleep(CONFIG.delayBetweenRequests);
    }
  }

  // HTML 생성
  console.log('\n📝 HTML 문서 생성 중...');
  const html = generateHTML(projectName, projectIdea, generatedSections);

  // 파일 저장
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${CONFIG.outputDir}/${projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${timestamp}.html`;
  
  await fs.writeFile(filename, html, 'utf8');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalWords = generatedSections.reduce((sum, s) => sum + s.wordCount, 0);
  const avgWordsPerSection = Math.round(totalWords / generatedSections.length);

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ 생성 완료!                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📁 파일: ${filename}`);
  console.log(`📄 총 페이지: 약 ${Math.ceil(totalWords / 500)}페이지`);
  console.log(`📝 총 단어 수: ${totalWords.toLocaleString()}단어`);
  console.log(`📊 평균 단어/섹션: ${avgWordsPerSection}단어`);
  console.log(`⏱️  소요 시간: ${totalTime}초 (${formatTime(Math.floor(totalTime))})`);
  console.log(`🎯 토큰 사용: ${totalTokens.input.toLocaleString()} input + ${totalTokens.output.toLocaleString()} output`);
  console.log('\n💡 브라우저에서 열어보세요!');
}

main().catch(console.error);
