/**
 * HTML 문서 생성 유틸리티
 * 이미지 통합 및 전문적인 문서 스타일링
 */

import { marked } from 'marked';

// Configure marked for GFM + line breaks
marked.setOptions({ gfm: true, breaks: true });

/**
 * Build a lookup from image results: sectionId → images[]
 */
function buildImageMap(imageResults) {
  const map = {};
  if (!imageResults || !Array.isArray(imageResults)) return map;
  
  for (const result of imageResults) {
    if (result.sectionId && result.images && result.images.length > 0) {
      map[result.sectionId] = result.images;
    }
  }
  return map;
}

/**
 * Render a single image as a <figure> block
 */
function renderImageFigure(image) {
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

/**
 * Insert images into section content based on position hints
 */
function embedImagesInContent(content, images) {
  if (!images || images.length === 0) return content;

  // Group images by position
  const topImages = [];
  const middleImages = [];
  const bottomImages = [];

  for (const img of images) {
    const pos = (img.position || 'top').toLowerCase();
    if (pos === 'bottom') {
      bottomImages.push(img);
    } else if (pos === 'middle') {
      middleImages.push(img);
    } else {
      // top, multiple, or default
      topImages.push(img);
    }
  }

  // Render image blocks
  const topHtml = topImages.map(renderImageFigure).join('\n');
  const middleHtml = middleImages.map(renderImageFigure).join('\n');
  const bottomHtml = bottomImages.map(renderImageFigure).join('\n');

  let result = '';

  // Top images: before content
  if (topHtml) {
    result += topHtml + '\n';
  }

  // Middle images: try to insert after the first major paragraph block
  if (middleHtml) {
    // Find a good midpoint - after ~40% of the content or after first </p> or </ul> or </table>
    const midPatterns = [/<\/p>/i, /<\/ul>/i, /<\/ol>/i, /<\/table>/i];
    let inserted = false;
    
    for (const pattern of midPatterns) {
      const idx = content.search(pattern);
      if (idx !== -1) {
        const insertPoint = idx + content.slice(idx).match(pattern)[0].length;
        result += content.slice(0, insertPoint) + '\n' + middleHtml + '\n' + content.slice(insertPoint);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      // Fallback: insert at roughly 40% of content length
      const mid = Math.floor(content.length * 0.4);
      const lineBreak = content.indexOf('\n', mid);
      if (lineBreak !== -1 && lineBreak < content.length * 0.6) {
        result += content.slice(0, lineBreak) + '\n' + middleHtml + '\n' + content.slice(lineBreak);
      } else {
        result += content + '\n' + middleHtml;
      }
    }
  } else {
    result += content;
  }

  // Bottom images: after content
  if (bottomHtml) {
    result += '\n' + bottomHtml;
  }

  return result;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateHTML(result, projectInfo) {
  const { design, sections, images, reviews, metadata } = result;
  const avgQuality = reviews.summary.averageScore;

  // Build image map for embedding
  const imageMap = buildImageMap(images);
  
  // Count total images
  const totalImageCount = images
    ? images.reduce((sum, r) => sum + (r.images ? r.images.length : 0), 0)
    : 0;

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
    
    h4 {
      color: #64748b;
      font-size: 14pt;
      font-weight: 600;
      margin: 20px 0 10px 0;
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

    /* Image styles */
    figure {
      margin: 28px auto;
      text-align: center;
      max-width: 720px;
    }
    
    figure img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      display: block;
      margin: 0 auto;
    }
    
    figcaption {
      margin-top: 10px;
      font-size: 13px;
      color: #6b7280;
      font-style: italic;
      line-height: 1.5;
    }
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
      <p><strong>이미지:</strong> ${totalImageCount}개</p>
      <p><strong>토큰 사용:</strong> ${metadata.totalTokens?.total?.toLocaleString() || 'N/A'} tokens</p>
      <p><strong>예상 비용:</strong> $${metadata.estimatedCost?.toFixed(4) || 'N/A'}</p>
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
    // Look up images for this section
    const sectionImages = imageMap[section.sectionId] || [];
    
    // Convert Markdown → HTML, then embed images
    const htmlContent = marked.parse(section.content || '') as string;
    const contentWithImages = embedImagesInContent(htmlContent, sectionImages);
    
    html += `  <div class="section page-break">
    <h2>${section.sectionId}</h2>
${contentWithImages}
  </div>\n\n`;
  });

  html += `</body>\n</html>`;
  return html;
}

/**
 * 요약 정보 추출
 */
export function extractSummary(result) {
  const { sections, images, reviews, metadata } = result;
  
  const imageCount = images
    ? images.reduce((sum, r) => sum + (r.images ? r.images.length : 0), 0)
    : 0;
  
  return {
    qualityScore: reviews.summary.averageScore,
    sectionCount: sections.length,
    wordCount: sections.reduce((sum, s) => sum + (s.wordCount || 0), 0),
    imageCount,
    tokenUsage: metadata.totalTokens,
    estimatedCost: metadata.estimatedCost
  };
}
