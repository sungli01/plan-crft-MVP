/**
 * HTML 문서 생성 유틸리티 v2
 * 슬라이드 비주얼 통합, GenSpark 스타일 프레젠테이션 지원
 */

import { marked } from 'marked';
import type { SlideData } from '../engine/agents/slide-generator';

// Configure marked for GFM + line breaks
marked.setOptions({ gfm: true, breaks: true });

function buildImageMap(imageResults: any[]) {
  const map: Record<string, any[]> = {};
  if (!imageResults || !Array.isArray(imageResults)) return map;
  for (const result of imageResults) {
    if (result.sectionId && result.images && result.images.length > 0) {
      map[result.sectionId] = result.images;
    }
  }
  return map;
}

function renderImageFigure(image: any) {
  const url = image.url || '';
  const caption = escapeHtml(image.caption || image.description || image.alt || '');
  const alt = escapeHtml(image.alt || image.caption || image.description || '');
  const isWebImage = image.source === 'brave-search' || image.source === 'web-image';
  const credit = image.credit ? `<span style="display:block;margin-top:4px;font-size:11px;color:#9ca3af;">${escapeHtml(image.credit)}</span>` : '';

  return `
    <figure class="document-image" style="margin: 28px auto; text-align: center; max-width: 720px;">
      <img src="${url}" alt="${alt}" 
           style="max-width: 100%; height: auto; border-radius: ${isWebImage ? '8px' : '12px'}; box-shadow: 0 4px 16px rgba(0,0,0,0.10); display: block; margin: 0 auto;" 
           loading="lazy"${isWebImage ? ' crossorigin="anonymous" referrerpolicy="no-referrer"' : ''} />
      <figcaption style="margin-top: 10px; font-size: 13px; color: #6b7280; font-style: italic; line-height: 1.5;">
        ${caption}${credit}
      </figcaption>
    </figure>`;
}

function embedImagesInContent(content: string, images: any[]) {
  if (!images || images.length === 0) return content;

  const topImages: any[] = [];
  const middleImages: any[] = [];
  const bottomImages: any[] = [];

  for (const img of images) {
    const pos = (img.position || 'top').toLowerCase();
    if (pos === 'bottom') bottomImages.push(img);
    else if (pos === 'middle') middleImages.push(img);
    else topImages.push(img);
  }

  const topHtml = topImages.map(renderImageFigure).join('\n');
  const middleHtml = middleImages.map(renderImageFigure).join('\n');
  const bottomHtml = bottomImages.map(renderImageFigure).join('\n');

  let result = '';
  if (topHtml) result += topHtml + '\n';

  if (middleHtml) {
    const midPatterns = [/<\/p>/i, /<\/ul>/i, /<\/ol>/i, /<\/table>/i];
    let inserted = false;
    for (const pattern of midPatterns) {
      const idx = content.search(pattern);
      if (idx !== -1) {
        const match = content.slice(idx).match(pattern)!;
        const insertPoint = idx + match[0].length;
        result += content.slice(0, insertPoint) + '\n' + middleHtml + '\n' + content.slice(insertPoint);
        inserted = true;
        break;
      }
    }
    if (!inserted) result += content + '\n' + middleHtml;
  } else {
    result += content;
  }

  if (bottomHtml) result += '\n' + bottomHtml;
  return result;
}

function escapeHtml(str: string) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render a slide visual card for embedding in the document
 */
function renderSlideVisual(slide: SlideData, sectionIdx: number): string {
  const c = slide.content || {};
  let visualHtml = '';

  // KPI cards
  if (c.kpiCards && c.kpiCards.length > 0) {
    visualHtml += `<div class="kpi-row">${c.kpiCards.map(k => `
      <div class="kpi-card">
        <div class="kpi-value">${escapeHtml(k.value)}</div>
        <div class="kpi-label">${escapeHtml(k.label)}</div>
        ${k.change ? `<div class="kpi-change ${k.change.startsWith('-') ? 'neg' : ''}">${escapeHtml(k.change)}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }

  // Chart image
  if (slide.chartUrl) {
    visualHtml += `
      <figure class="slide-chart" style="margin:24px auto;text-align:center;max-width:680px;">
        <img src="${slide.chartUrl}" alt="${escapeHtml(slide.title)}" 
             style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.08);" loading="lazy"/>
      </figure>`;
  }

  // DALL-E diagram
  if (slide.diagramUrl) {
    visualHtml += `
      <figure class="slide-diagram" style="margin:24px auto;text-align:center;max-width:720px;">
        <img src="${slide.diagramUrl}" alt="${escapeHtml(slide.title)}" 
             style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.08);" loading="lazy"/>
      </figure>`;
  }

  // Icon boxes
  if (c.iconBoxes && c.iconBoxes.length > 0) {
    visualHtml += `<div class="icon-grid-doc">${c.iconBoxes.map(ib => `
      <div class="icon-box-doc">
        <div class="ib-icon">${ib.icon}</div>
        <div class="ib-title">${escapeHtml(ib.title)}</div>
        <div class="ib-desc">${escapeHtml(ib.description)}</div>
      </div>`).join('')}
    </div>`;
  }

  if (!visualHtml) return '';

  return `
    <div class="slide-visual-card">
      <div class="svc-header">
        <span class="svc-badge">📊 핵심 요약</span>
        <span class="svc-title">${escapeHtml(slide.title)}</span>
      </div>
      <div class="svc-body">
        ${visualHtml}
      </div>
    </div>`;
}

export function generateHTML(result: any, projectInfo: any) {
  const { design, sections, images, reviews, metadata } = result;
  const slideDataArray: SlideData[] = result.pptSlideData || [];
  const avgQuality = reviews?.summary?.averageScore ?? 0;
  const imageMap = buildImageMap(images);
  
  const totalImageCount = images
    ? images.reduce((sum: number, r: any) => sum + (r.images ? r.images.length : 0), 0)
    : 0;

  const slideVisualCount = slideDataArray.filter(s => s.chartUrl || s.diagramUrl || (s.content?.kpiCards && s.content.kpiCards.length > 0)).length;

  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${projectInfo.title} - Plan-Craft v4.0</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.9; color: #222; max-width: 210mm; margin: 0 auto; padding: 30px; background: #fff;
    }
    h1 { color: #1a1a1a; font-size: 28pt; font-weight: 700; margin: 40px 0 20px; padding-bottom: 12px; border-bottom: 3px solid #2563eb; }
    h2 { color: #2c3e50; font-size: 20pt; font-weight: 600; margin: 30px 0 15px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6; }
    h3 { color: #475569; font-size: 16pt; font-weight: 600; margin: 24px 0 12px; padding-left: 12px; border-left: 4px solid #60a5fa; }
    h4 { color: #64748b; font-size: 14pt; font-weight: 600; margin: 20px 0 10px; }
    p { margin: 10px 0; text-align: justify; line-height: 1.8; }
    ul, ol { margin: 12px 0; padding-left: 30px; }
    li { margin: 8px 0; line-height: 1.7; }
    strong { color: #1e40af; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11pt; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #334155; }
    .cover { text-align: center; padding: 100px 0; page-break-after: always; }
    .cover h1 { font-size: 36pt; color: #1e3a8a; border: none; margin-bottom: 40px; }
    .cover .subtitle { font-size: 20pt; color: #64748b; margin: 20px 0; }
    .stats { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 24px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #2563eb; }
    .stats h3 { color: #1e40af; border: none; padding: 0; margin-bottom: 16px; }
    .section { page-break-inside: avoid; margin-bottom: 40px; }
    .page-break { page-break-after: always; }

    /* Slide Visual Cards */
    .slide-visual-card {
      margin: 28px 0; border-radius: 14px; overflow: hidden;
      box-shadow: 0 4px 20px rgba(37,99,235,0.12), 0 1px 4px rgba(0,0,0,0.06);
      border: 1px solid #dbeafe; page-break-inside: avoid;
    }
    .svc-header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 60%, #1e3a8a 100%);
      padding: 14px 22px; display: flex; align-items: center; gap: 10px;
    }
    .svc-badge { font-size: 18px; }
    .svc-title { color: #fff; font-size: 14pt; font-weight: 700; letter-spacing: -0.3px; }
    .svc-body { background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); padding: 20px 24px; }

    /* KPI Cards */
    .kpi-row { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin: 16px 0; }
    .kpi-card { background: white; border-radius: 12px; padding: 20px 24px; text-align: center; border: 1px solid #E2E8F0; flex: 1; min-width: 140px; max-width: 220px; }
    .kpi-value { font-size: 36px; font-weight: 800; color: #2563EB; }
    .kpi-label { font-size: 13px; color: #64748B; margin-top: 4px; }
    .kpi-change { font-size: 12px; color: #10B981; font-weight: 600; margin-top: 2px; }
    .kpi-change.neg { color: #EF4444; }

    /* Icon Grid */
    .icon-grid-doc { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 16px 0; }
    .icon-box-doc { background: white; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0; }
    .ib-icon { font-size: 24px; margin-bottom: 6px; }
    .ib-title { font-size: 14px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
    .ib-desc { font-size: 12px; color: #64748B; line-height: 1.5; }

    @media print {
      .slide-visual-card { box-shadow: none; border: 2px solid #2563eb; }
      .svc-header, .svc-body, .kpi-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${projectInfo.title}</h1>
    <div class="subtitle">사업계획서</div>
    <div class="subtitle">Plan-Craft v4.0 (GenSpark 스타일 멀티 에이전트)</div>
    <div class="subtitle" style="margin-top: 50px;">${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div class="stats">
      <h3>📊 문서 정보</h3>
      <p><strong>생성 방식:</strong> 프레젠테이션 먼저 → 문서 확장 (GenSpark 패턴)</p>
      <p><strong>총 섹션:</strong> ${sections.length}개</p>
      <p><strong>슬라이드:</strong> ${slideDataArray.length}장 (차트/다이어그램 ${slideVisualCount}개)</p>
      <p><strong>평균 품질:</strong> ${avgQuality.toFixed(1)}/100점</p>
      <p><strong>이미지:</strong> ${totalImageCount}개</p>
      <p><strong>토큰 사용:</strong> ${metadata.tokenUsage?.total?.toLocaleString() || 'N/A'} tokens</p>
      <p><strong>생성 시간:</strong> ${metadata.totalTime ? Math.round(metadata.totalTime / 1000) : 'N/A'}초</p>
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

  sections.forEach((section: any) => {
    const review = reviews?.reviews?.find((r: any) => r.sectionId === section.sectionId);
    const score = review ? review.review?.overallScore ?? 0 : 0;
    html += `      <li>${section.sectionId} (품질: ${score}/100)</li>\n`;
  });

  html += `    </ol>
  </div>
`;

  sections.forEach((section: any, idx: number) => {
    const sectionImages = imageMap[section.sectionId] || [];
    
    // Find matching slide visual for this section
    let slideVisualHtml = '';
    if (slideDataArray.length > 0) {
      const slideIdx = Math.min(Math.floor((idx / sections.length) * slideDataArray.length) + 2, slideDataArray.length - 2);
      const slide = slideDataArray[slideIdx];
      if (slide && (slide.chartUrl || slide.diagramUrl || (slide.content?.kpiCards && slide.content.kpiCards.length > 0) || (slide.content?.iconBoxes && slide.content.iconBoxes.length > 0))) {
        slideVisualHtml = renderSlideVisual(slide, idx);
      }
    }
    
    const htmlContent = marked.parse(section.content || '') as string;
    const contentWithImages = embedImagesInContent(htmlContent, sectionImages);
    
    html += `  <div class="section page-break">
    <h2>${section.sectionId}</h2>
${slideVisualHtml}
${contentWithImages}
  </div>\n\n`;
  });

  html += `</body>\n</html>`;
  return html;
}

export function extractSummary(result: any) {
  const { sections, images, reviews, metadata } = result;
  
  const imageCount = images
    ? images.reduce((sum: number, r: any) => sum + (r.images ? r.images.length : 0), 0)
    : 0;
  
  return {
    qualityScore: reviews?.summary?.averageScore ?? 0,
    sectionCount: sections.length,
    wordCount: sections.reduce((sum: number, s: any) => sum + (s.wordCount || 0), 0),
    imageCount,
    tokenUsage: metadata.tokenUsage,
    totalTokens: metadata.tokenUsage,
    estimatedCost: metadata.estimatedCost
  };
}
