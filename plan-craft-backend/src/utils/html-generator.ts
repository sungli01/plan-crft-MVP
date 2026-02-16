/**
 * HTML 문서 생성 유틸리티 v2
 * 슬라이드 비주얼 통합, GenSpark 스타일 프레젠테이션 지원
 */

import { marked } from 'marked';

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

export function generateHTML(result: any, projectInfo: any) {
  const { design, sections, images, reviews, metadata } = result;
  const avgQuality = reviews?.summary?.averageScore ?? 0;
  const imageMap = buildImageMap(images);
  
  const totalImageCount = images
    ? images.reduce((sum: number, r: any) => sum + (r.images ? r.images.length : 0), 0)
    : 0;

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
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11pt; border: 1px solid #94a3b8; border-radius: 8px; overflow: hidden; }
    th, td { border: 1px solid #cbd5e1; padding: 12px 14px; text-align: left; line-height: 1.6; }
    th { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); font-weight: 600; color: #ffffff; border-color: #1e40af; }
    tr:nth-child(even) { background-color: #f8fafc; }
    tr:nth-child(odd) { background-color: #ffffff; }
    tr:hover { background-color: #eff6ff; transition: background-color 0.2s; }
    td:first-child { font-weight: 500; }
    /* Inline citations [1], [2] styling */
    .section p, .section li, .section td { }
    
    /* References section styling */
    .references-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px 28px; margin-top: 32px; }
    .references-section h2 { color: #1e40af; border-bottom: 2px solid #1e40af; }
    .references-section p, .references-section li { font-size: 10.5pt; line-height: 1.7; color: #475569; word-break: break-all; }

    .cover { text-align: center; padding: 100px 0; page-break-after: always; }
    .cover h1 { font-size: 36pt; color: #1e3a8a; border: none; margin-bottom: 40px; }
    .cover .subtitle { font-size: 20pt; color: #64748b; margin: 20px 0; }
    .stats { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 24px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #2563eb; }
    .stats h3 { color: #1e40af; border: none; padding: 0; margin-bottom: 16px; }
    .section { page-break-inside: avoid; margin-bottom: 40px; }
    .page-break { page-break-after: always; }

    @media print {
      body { margin: 0; }
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
      <p><strong>총 섹션:</strong> ${sections.length}개</p>
      <p><strong>이미지:</strong> ${totalImageCount}개</p>
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
    
    let htmlContent = marked.parse(section.content || '') as string;
    // Style inline citations [1], [2], etc. as superscript links
    htmlContent = htmlContent.replace(/\[(\d{1,3})\]/g, '<sup style="font-size:0.75em;color:#2563eb;font-weight:600;cursor:pointer;">[$1]</sup>');
    const contentWithImages = embedImagesInContent(htmlContent, sectionImages);
    
    // Check if this is a references section
    const isReferencesSection = /참고문헌|references/i.test(section.sectionId);
    
    html += `  <div class="section page-break${isReferencesSection ? ' references-section' : ''}">
    <h2>${section.sectionId}</h2>
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
