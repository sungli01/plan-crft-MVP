/**
 * HTML 문서 생성 유틸리티
 */

export function generateHTML(result, projectInfo) {
  const { design, sections, reviews, metadata } = result;
  const avgQuality = reviews.summary.averageScore;

  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${projectInfo.title} - Plan-Craft v3.0</title>
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
    
    p { margin: 10px 0; text-align: justify; line-height: 1.8; }
    ul, ol { margin: 12px 0; padding-left: 30px; }
    li { margin: 8px 0; line-height: 1.7; }
    li > ul, li > ol { margin: 6px 0; }
    strong { color: #1e40af; font-weight: 600; }
    
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
    
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${projectInfo.title}</h1>
    <div class="subtitle">국가 R&D 과제 사업계획서</div>
    <div class="subtitle">Plan-Craft v3.0 (멀티 에이전트)</div>
    <div class="subtitle" style="margin-top: 50px;">${new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</div>
    <div class="stats">
      <h3>📊 문서 정보</h3>
      <p><strong>생성 방식:</strong> 멀티 에이전트 시스템 (4개 AI)</p>
      <p><strong>총 섹션:</strong> ${sections.length}개</p>
      <p><strong>평균 품질:</strong> ${avgQuality.toFixed(1)}/100점</p>
      <p><strong>토큰 사용:</strong> ${metadata.totalTokens.total.toLocaleString()} tokens</p>
      <p><strong>예상 비용:</strong> $${metadata.estimatedCost.toFixed(4)}</p>
      <p><strong>생성 시간:</strong> ${metadata.totalTime}초</p>
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

  sections.forEach((section, idx) => {
    const review = reviews.reviews.find(r => r.sectionId === section.sectionId);
    const score = review ? review.review.overallScore : 0;
    html += `      <li>${section.sectionId} (품질: ${score}/100)</li>\n`;
  });

  html += `    </ol>
  </div>
`;

  sections.forEach((section) => {
    html += `  <div class="section page-break">
    <h1>${section.sectionId}</h1>
${section.content}
  </div>\n\n`;
  });

  html += `</body>\n</html>`;
  return html;
}

/**
 * 요약 정보 추출
 */
export function extractSummary(result) {
  const { sections, reviews, metadata } = result;
  
  return {
    qualityScore: reviews.summary.averageScore,
    sectionCount: sections.length,
    wordCount: sections.reduce((sum, s) => sum + (s.wordCount || 0), 0),
    imageCount: 0, // TODO: 이미지 카운트 로직 추가
    tokenUsage: metadata.totalTokens,
    estimatedCost: metadata.estimatedCost
  };
}
