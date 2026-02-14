/**
 * PDF Presenter Agent
 * 섹션 마크다운을 16:9 비즈니스 슬라이드 HTML로 변환
 * PPT 대신 브라우저 인쇄(PDF 저장) 방식 채택
 */

import Anthropic from '@anthropic-ai/sdk';

export interface PdfPresenterConfig {
  apiKey: string;
  model?: string;
}

export interface PresenterSection {
  id: string;
  title: string;
  content: string;
  wordCount?: number;
}

export interface PresenterProjectInfo {
  title: string;
  idea?: string;
  company?: string;
  date?: string;
}

interface SlideContent {
  title: string;
  html: string;
  speakerNotes?: string;
}

export class PdfPresenterAgent {
  private apiKey: string;
  private model: string;

  constructor(config: PdfPresenterConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * AI로 섹션 내용을 슬라이드 HTML 조각으로 변환
   */
  private async generateSlideContent(sections: PresenterSection[], projectInfo: PresenterProjectInfo): Promise<SlideContent[]> {
    const client = new Anthropic({ apiKey: this.apiKey });
    const allSlides: SlideContent[] = [];

    // Process in batches of 3
    const batchSize = 3;
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      const sectionsText = batch.map((s, idx) =>
        `[섹션 ${i + idx + 1}: ${s.title}]\n${s.content.substring(0, 3000)}`
      ).join('\n\n---\n\n');

      try {
        const response = await client.messages.create({
          model: this.model,
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `다음 문서 섹션들을 고품질 발표자료 슬라이드로 변환하세요.

프로젝트: "${projectInfo.title}"

각 섹션에 대해 1~3개의 슬라이드를 만드세요. 다음 JSON 배열로 응답:
[
  {
    "title": "슬라이드 제목",
    "html": "<슬라이드 내부 HTML>",
    "speakerNotes": "발표자 노트"
  }
]

## 품질 기준 (필수)
1. **핵심 포인트 3~5개**: 한 슬라이드에 불릿 3~5개만. 6개 이상이면 슬라이드 분할
2. **수치/통계 강조 필수**: 문서에서 수치가 있으면 반드시 stat-grid로 크게 표시. 수치 없는 슬라이드가 연속 2개 이상이면 안됨
3. **표/비교 시각화 포함**: 비교 항목이 있으면 반드시 comparison-table 사용
4. **발표자 노트 필수**: 각 슬라이드마다 실제 발표 시 말할 스크립트 2-3문장

## HTML 규칙
- 사용 가능한 CSS 클래스: slide-title, slide-subtitle, bullet-list, key-number, key-label, stat-grid, stat-item, comparison-table, process-steps, step-item, highlight-box
- 핵심 포인트만 추출 (장황한 텍스트 금지, 각 불릿 30자 이내)
- 수치/통계: <div class="stat-grid"><div class="stat-item"><span class="key-number">42%</span><span class="key-label">성장률</span></div></div>
- 비교: <table class="comparison-table"> 사용
- 프로세스: <div class="process-steps"><div class="step-item"><span class="step-num">1</span><span class="step-text">내용</span></div></div>
- 불릿 리스트: <ul class="bullet-list"><li>내용</li></ul>
- 강조 박스: <div class="highlight-box">핵심 메시지</div>

JSON 배열만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.

${sectionsText}`
          }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]) as SlideContent[];
            allSlides.push(...parsed);
          } catch {
            batch.forEach(s => {
              allSlides.push({
                title: s.title,
                html: `<ul class="bullet-list"><li>${s.title} 내용</li></ul>`,
              });
            });
          }
        } else {
          batch.forEach(s => {
            allSlides.push({
              title: s.title,
              html: `<ul class="bullet-list"><li>${s.title} 내용</li></ul>`,
            });
          });
        }
      } catch (err: any) {
        console.warn(`[PdfPresenter] AI failed for batch: ${err.message}`);
        batch.forEach(s => {
          allSlides.push({
            title: s.title,
            html: `<ul class="bullet-list"><li>${s.title}</li></ul>`,
          });
        });
      }
    }

    return allSlides;
  }

  /**
   * 전체 프레젠테이션 HTML 생성
   */
  async generatePresentation(
    sections: PresenterSection[],
    projectInfo: PresenterProjectInfo
  ): Promise<{ html: string; slideCount: number }> {
    console.log(`🎬 [PdfPresenter] Starting presentation for "${projectInfo.title}" (${sections.length} sections)`);

    const slideContents = await this.generateSlideContent(sections, projectInfo);
    const dateStr = projectInfo.date || new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build TOC from sections
    const tocItems = sections.map((s, i) => `<li><span class="toc-num">${String(i + 1).padStart(2, '0')}</span>${s.title}</li>`).join('\n');

    // Build content slides
    const contentSlides = slideContents.map((slide, i) => `
    <div class="slide">
      <div class="slide-header">
        <div class="slide-header-bar"></div>
        <span class="slide-page">${i + 3}</span>
      </div>
      <h2 class="slide-title">${escapeHtml(slide.title)}</h2>
      <div class="slide-body">${slide.html}</div>
      <div class="slide-footer">Plan-Craft AI</div>
    </div>`).join('\n');

    const totalSlides = slideContents.length + 4; // cover + toc + content + summary + thanks

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=960">
<title>${escapeHtml(projectInfo.title)} - 발표자료</title>
<style>
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #e2e8f0;
    font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    gap: 32px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .slide {
    width: 960px;
    height: 540px;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    padding: 48px 64px;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    page-break-inside: avoid;
  }

  /* Header bar */
  .slide-header { position: absolute; top: 0; left: 0; right: 0; height: 6px; }
  .slide-header-bar { width: 100%; height: 100%; background: linear-gradient(90deg, #1e3a5f, #2563eb); }
  .slide-page {
    position: absolute; bottom: 16px; right: 24px;
    font-size: 12px; color: #94a3b8; font-variant-numeric: tabular-nums;
  }
  .slide-footer {
    position: absolute; bottom: 16px; left: 24px;
    font-size: 11px; color: #cbd5e1; font-style: italic;
  }

  /* Cover */
  .slide-cover {
    display: flex; flex-direction: column; justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%);
    color: white;
  }
  .slide-cover .cover-title { font-size: 36px; font-weight: 800; line-height: 1.3; margin-bottom: 16px; }
  .slide-cover .cover-subtitle { font-size: 18px; font-weight: 400; color: #93c5fd; margin-bottom: 40px; line-height: 1.6; }
  .slide-cover .cover-meta { font-size: 14px; color: #64748b; }
  .slide-cover .cover-meta span { color: #93c5fd; }
  .slide-cover .cover-bar { width: 80px; height: 4px; background: #3b82f6; border-radius: 2px; margin-bottom: 32px; }
  .slide-cover .slide-footer { color: rgba(255,255,255,0.3); }

  /* TOC */
  .toc-list { list-style: none; padding: 0; margin-top: 12px; }
  .toc-list li {
    font-size: 18px; line-height: 2.2; color: #334155;
    border-bottom: 1px solid #f1f5f9; padding: 4px 0;
  }
  .toc-num { display: inline-block; width: 36px; font-weight: 700; color: #2563eb; }

  /* Content slides */
  .slide-title { font-size: 26px; font-weight: 700; color: #1e3a5f; margin-bottom: 24px; padding-top: 8px; }
  .slide-subtitle { font-size: 17px; color: #64748b; margin-bottom: 16px; }
  .slide-body { flex: 1; }

  .bullet-list { list-style: none; padding: 0; }
  .bullet-list li {
    font-size: 19px; line-height: 1.9; color: #334155;
    padding-left: 28px; position: relative; margin-bottom: 4px;
  }
  .bullet-list li::before {
    content: ''; position: absolute; left: 0; top: 14px;
    width: 10px; height: 10px; border-radius: 50%; background: #2563eb;
  }

  /* Key numbers */
  .stat-grid { display: flex; gap: 32px; flex-wrap: wrap; margin: 16px 0; }
  .stat-item { text-align: center; flex: 1; min-width: 140px; }
  .key-number { display: block; font-size: 48px; font-weight: 800; color: #2563eb; line-height: 1.2; }
  .key-label { display: block; font-size: 15px; color: #64748b; margin-top: 4px; }

  /* Comparison table */
  .comparison-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 15px; }
  .comparison-table th {
    background: #1e3a5f; color: white; padding: 10px 14px; text-align: left; font-weight: 600;
  }
  .comparison-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  .comparison-table tr:nth-child(even) td { background: #f8fafc; }

  /* Process steps */
  .process-steps { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
  .step-item {
    flex: 1; min-width: 120px; background: #f0f9ff; border-radius: 12px;
    padding: 20px 16px; text-align: center; position: relative;
  }
  .step-num {
    display: inline-block; width: 32px; height: 32px; line-height: 32px;
    background: #2563eb; color: white; border-radius: 50%;
    font-weight: 700; font-size: 16px; margin-bottom: 8px;
  }
  .step-text { display: block; font-size: 14px; color: #334155; line-height: 1.5; }

  /* Highlight box */
  .highlight-box {
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    border-left: 4px solid #2563eb; border-radius: 8px;
    padding: 20px 24px; margin: 16px 0;
    font-size: 17px; color: #1e3a5f; font-weight: 500;
  }

  /* Summary slide */
  .summary-points { list-style: none; padding: 0; }
  .summary-points li {
    font-size: 20px; line-height: 2; color: #1e3a5f; font-weight: 500;
    padding-left: 32px; position: relative;
  }
  .summary-points li::before {
    content: '✓'; position: absolute; left: 0; color: #2563eb; font-weight: 700;
  }

  /* Thanks slide */
  .slide-thanks {
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%);
    color: white; text-align: center;
  }
  .slide-thanks .thanks-text { font-size: 42px; font-weight: 800; margin-bottom: 16px; }
  .slide-thanks .thanks-sub { font-size: 18px; color: #93c5fd; }
  .slide-thanks .slide-footer { color: rgba(255,255,255,0.3); }

  /* Print toolbar */
  .print-toolbar {
    position: fixed; top: 20px; right: 20px; z-index: 1000;
    display: flex; gap: 8px;
  }
  .print-toolbar button {
    padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;
    font-size: 14px; font-weight: 600; font-family: inherit;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.1s;
  }
  .print-toolbar button:hover { transform: translateY(-1px); }
  .btn-print { background: #2563eb; color: white; }
  .btn-notes { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0 !important; }

  @media print {
    body { background: white; padding: 0; gap: 0; }
    .slide { box-shadow: none; border-radius: 0; margin: 0; }
    .print-toolbar { display: none !important; }
    @page { size: 960px 540px; margin: 0; }
  }
</style>
</head>
<body>

<div class="print-toolbar">
  <button class="btn-print" onclick="window.print()">📥 PDF로 저장 (Ctrl+P)</button>
</div>

<!-- Cover Slide -->
<div class="slide slide-cover">
  <div class="cover-bar"></div>
  <h1 class="cover-title">${escapeHtml(projectInfo.title)}</h1>
  <p class="cover-subtitle">${escapeHtml(projectInfo.idea || '')}</p>
  <p class="cover-meta">
    <span>${dateStr}</span>${projectInfo.company ? ` · ${escapeHtml(projectInfo.company)}` : ''}<br>
    Plan-Craft AI 발표자료
  </p>
  <div class="slide-footer">Plan-Craft AI</div>
</div>

<!-- TOC Slide -->
<div class="slide">
  <div class="slide-header"><div class="slide-header-bar"></div><span class="slide-page">2</span></div>
  <h2 class="slide-title">목차</h2>
  <ol class="toc-list">${tocItems}</ol>
  <div class="slide-footer">Plan-Craft AI</div>
</div>

<!-- Content Slides -->
${contentSlides}

<!-- Summary Slide -->
<div class="slide">
  <div class="slide-header"><div class="slide-header-bar"></div><span class="slide-page">${totalSlides - 1}</span></div>
  <h2 class="slide-title">요약 및 결론</h2>
  <div class="highlight-box">
    본 발표자료는 <strong>"${escapeHtml(projectInfo.title)}"</strong>에 대한 핵심 내용을 ${sections.length}개 섹션으로 정리하였습니다.
  </div>
  <p class="slide-subtitle" style="margin-top:24px">상세 내용은 함께 제공되는 문서를 참고해주세요.</p>
  <div class="slide-footer">Plan-Craft AI</div>
</div>

<!-- Thanks Slide -->
<div class="slide slide-thanks">
  <p class="thanks-text">감사합니다</p>
  <p class="thanks-sub">${escapeHtml(projectInfo.title)}</p>
  <div class="slide-footer">Plan-Craft AI</div>
</div>

</body>
</html>`;

    console.log(`✅ [PdfPresenter] Presentation generated: ${totalSlides} slides`);
    return { html, slideCount: totalSlides };
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
