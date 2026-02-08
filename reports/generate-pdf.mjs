import { readFileSync, writeFileSync } from 'fs';
import { Marked } from 'marked';

const marked = new Marked();

const files = [
  { path: 'reports/PROJECT_HISTORY.md', title: '📜 개발 히스토리' },
  { path: 'reports/ARCHITECTURE.md', title: '📐 기술 아키텍처' },
  { path: 'reports/INSTRUCTIONS.md', title: '📖 사용 설명서' },
  { path: 'reports/improvement-plan.md', title: '💡 개선사항 분석 보고서' },
  { path: 'reports/skywork-analysis.md', title: '🔍 Skywork.ai 벤치마킹 분석' },
];

let toc = '';
let sections = '';

for (const file of files) {
  const md = readFileSync(file.path, 'utf-8');
  const html = marked.parse(md);
  const anchor = file.path.replace(/[^a-z]/gi, '-');
  
  toc += `<li><a href="#${anchor}">${file.title}</a></li>\n`;
  sections += `
    <div class="section-break" id="${anchor}"></div>
    <section>
      ${html}
    </section>
  `;
}

const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>Plan-Craft v3.0 — 프로젝트 종합 보고서</title>
  <style>
    @media print {
      body { margin: 0; }
      @page { size: A4; margin: 15mm 20mm; }
      .no-print { display: none !important; }
      .section-break { page-break-before: always; }
      .section-break:first-of-type { page-break-before: auto; }
    }
    
    * { box-sizing: border-box; }
    
    body {
      font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
      line-height: 1.8;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      font-size: 14px;
    }
    
    /* Cover Page */
    .cover {
      text-align: center;
      padding: 80px 0 60px;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 42px;
      color: #1e40af;
      margin-bottom: 8px;
      border: none;
    }
    .cover .version {
      font-size: 20px;
      color: #6b7280;
      margin-bottom: 40px;
    }
    .cover .meta {
      font-size: 14px;
      color: #9ca3af;
      line-height: 2;
    }
    .cover .meta strong { color: #374151; }
    .cover .divider {
      width: 60px;
      height: 4px;
      background: linear-gradient(to right, #2563eb, #7c3aed);
      margin: 30px auto;
      border-radius: 2px;
    }
    .cover .stats {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 40px;
    }
    .cover .stat {
      text-align: center;
    }
    .cover .stat .value {
      font-size: 28px;
      font-weight: 700;
      color: #2563eb;
    }
    .cover .stat .label {
      font-size: 12px;
      color: #6b7280;
    }
    
    /* TOC */
    .toc {
      page-break-after: always;
    }
    .toc h2 { 
      font-size: 24px; 
      color: #1e40af; 
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
    }
    .toc ul {
      list-style: none;
      padding: 0;
    }
    .toc li {
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 16px;
    }
    .toc a {
      color: #1e40af;
      text-decoration: none;
    }
    .toc a:hover { text-decoration: underline; }
    
    /* Content */
    h1 {
      font-size: 28px;
      color: #1e40af;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      font-size: 22px;
      color: #1e3a5f;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-top: 32px;
    }
    h3 { font-size: 18px; color: #374151; margin-top: 24px; }
    h4 { font-size: 16px; color: #4b5563; margin-top: 20px; }
    
    p { margin: 8px 0; text-align: justify; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
    }
    th { background: #f3f4f6; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
    }
    
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.6;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    
    blockquote {
      border-left: 4px solid #2563eb;
      margin: 16px 0;
      padding: 12px 20px;
      background: #eff6ff;
      color: #1e40af;
    }
    
    ul, ol { padding-left: 24px; }
    li { margin: 4px 0; }
    
    a { color: #2563eb; }
    
    img { max-width: 100%; height: auto; }
    
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 28px;
      background: linear-gradient(to right, #2563eb, #7c3aed);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      z-index: 100;
    }
    .print-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4); }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">📥 PDF로 저장 (Ctrl+P)</button>

  <!-- Cover Page -->
  <div class="cover">
    <h1>Plan-Craft</h1>
    <div class="version">v3.0 프로젝트 종합 보고서</div>
    <div class="divider"></div>
    <div class="meta">
      <strong>프로젝트:</strong> AI 기반 사업계획서 자동 생성 플랫폼<br>
      <strong>개발 기간:</strong> 2026-02-07 ~ 2026-02-08 (2일)<br>
      <strong>개발팀:</strong> 바질 (AI 어시스턴트) + 형님 (프로젝트 오너)<br>
      <strong>기술 스택:</strong> Next.js 14, Hono, PostgreSQL, Claude Opus 4.6<br>
      <strong>보고서 작성일:</strong> ${new Date().toLocaleDateString('ko-KR')}
    </div>
    <div class="stats">
      <div class="stat"><div class="value">87.6</div><div class="label">품질 점수 /100</div></div>
      <div class="stat"><div class="value">23건</div><div class="label">개선 완료</div></div>
      <div class="stat"><div class="value">5</div><div class="label">보고서</div></div>
      <div class="stat"><div class="value">2일</div><div class="label">개발 기간</div></div>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h2>📑 목차</h2>
    <ul>
      ${toc}
    </ul>
  </div>

  <!-- Content -->
  ${sections}

  <!-- Footer -->
  <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>Plan-Craft v3.0 — AI 기반 사업계획서 자동 생성 플랫폼</p>
    <p>GitHub: https://github.com/sungli01/plan-crft-MVP.git</p>
    <p>Frontend: https://plan-crft-mvp-ot41.vercel.app | Backend: https://plan-crft-mvp-production.up.railway.app</p>
    <p>Generated by 바질 (AI Assistant) · ${new Date().toLocaleDateString('ko-KR')}</p>
  </div>
</body>
</html>`;

writeFileSync('reports/Plan-Craft-v3.0-종합보고서.html', fullHtml, 'utf-8');
console.log('✅ PDF용 HTML 생성 완료: reports/Plan-Craft-v3.0-종합보고서.html');
