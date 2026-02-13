/**
 * PPT Generator Agent
 * 섹션 구조 기반으로 pptxgenjs를 사용하여 PPTX 슬라이드를 생성
 */

import Anthropic from '@anthropic-ai/sdk';
import PptxGenJSModule from 'pptxgenjs';
const PptxGenJS = (PptxGenJSModule as any).default || PptxGenJSModule;

// ── Design Constants ────────────────────────────────────────────
const COLORS = {
  primary: '3F51B5',      // Deep Indigo
  primaryDark: '303F9F',
  primaryLight: '7986CB',
  white: 'FFFFFF',
  lightGray: 'F5F5F5',
  gray: '9E9E9E',
  darkGray: '424242',
  text: '212121',
  textSecondary: '757575',
  accent: 'FF5722',
  headerBar: '3F51B5',
};

const FONTS = {
  korean: '맑은 고딕',
  english: 'Arial',
  default: '맑은 고딕',
};

const MAX_SLIDES = 20;

export interface PptGeneratorConfig {
  apiKey: string;
  model?: string;
}

export interface PptSection {
  id: string;
  title: string;
  content: string;
  wordCount?: number;
}

export interface PptProjectInfo {
  title: string;
  idea?: string;
  company?: string;
  date?: string;
}

export interface SlideData {
  sectionTitle: string;
  sectionId?: string;
  bullets: string[];
  keyData?: string;
  hasTable?: boolean;
  tableData?: string[][];
}

export class PptGeneratorAgent {
  private apiKey: string;
  private model: string;

  constructor(config: PptGeneratorConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * AI를 사용하여 섹션 내용을 PPT용 핵심 포인트로 요약
   */
  private async summarizeSectionsForPpt(sections: PptSection[], projectInfo: PptProjectInfo): Promise<SlideData[]> {
    const client = new Anthropic({ apiKey: this.apiKey });

    // Batch sections to reduce API calls (max 5 sections per call)
    const batchSize = 5;
    const allSlides: SlideData[] = [];

    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      const sectionsText = batch.map((s, idx) => 
        `[섹션 ${i + idx + 1}: ${s.title}]\n${s.content.substring(0, 2000)}`
      ).join('\n\n---\n\n');

      try {
        const response = await client.messages.create({
          model: this.model,
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `다음 문서 섹션들을 PPT 슬라이드용으로 요약해주세요.

각 섹션에 대해 다음 JSON 배열 형식으로 응답하세요:
[
  {
    "sectionTitle": "섹션 제목",
    "bullets": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
    "keyData": "주요 수치/데이터 (있으면)",
    "hasTable": false,
    "tableData": []
  }
]

규칙:
- 각 섹션당 3-5개 핵심 bullet point
- bullet은 간결하게 (각 30자 이내)
- 표가 있으면 hasTable: true + 2차원 배열로 tableData 제공 (최대 5행 4열)
- 숫자/통계가 있으면 keyData에 포함

프로젝트: ${projectInfo.title}

${sectionsText}

JSON 배열만 응답하세요.`
          }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]) as SlideData[];
            allSlides.push(...parsed);
          } catch {
            // Fallback: create basic slides from section titles
            batch.forEach(s => {
              allSlides.push({
                sectionTitle: s.title,
                bullets: ['내용 요약 준비 중'],
                keyData: undefined,
              });
            });
          }
        } else {
          batch.forEach(s => {
            allSlides.push({
              sectionTitle: s.title,
              bullets: ['내용 요약 준비 중'],
            });
          });
        }
      } catch (err: any) {
        console.warn(`[PptGenerator] AI summarization failed for batch: ${err.message}`);
        batch.forEach(s => {
          allSlides.push({
            sectionTitle: s.title,
            bullets: ['내용 요약 준비 중'],
          });
        });
      }
    }

    return allSlides;
  }

  /**
   * 헤더바를 슬라이드에 추가 (상단 인디고 바 + 페이지 번호)
   */
  private addHeaderBar(slide: PptxGenJS.Slide, pageNum?: number, totalPages?: number): void {
    // Top color bar
    slide.addShape('rect' as any, {
      x: 0, y: 0, w: '100%', h: 0.4,
      fill: { color: COLORS.headerBar },
    });

    // Page number (bottom right)
    if (pageNum !== undefined) {
      slide.addText(`${pageNum}${totalPages ? ` / ${totalPages}` : ''}`, {
        x: 8.5, y: 5.0, w: 1.2, h: 0.3,
        fontSize: 9,
        color: COLORS.gray,
        fontFace: FONTS.english,
        align: 'right',
      });
    }

    // Bottom thin line
    slide.addShape('rect' as any, {
      x: 0.5, y: 5.1, w: 9, h: 0.02,
      fill: { color: COLORS.primaryLight },
    });
  }

  /**
   * 표지 슬라이드 생성
   */
  private createCoverSlide(pres: PptxGenJS, info: PptProjectInfo): void {
    const slide = pres.addSlide();

    // Full background gradient effect via large rect
    slide.addShape('rect' as any, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { color: COLORS.white },
    });

    // Top accent bar (wider)
    slide.addShape('rect' as any, {
      x: 0, y: 0, w: '100%', h: 0.6,
      fill: { color: COLORS.primary },
    });

    // Left accent strip
    slide.addShape('rect' as any, {
      x: 0, y: 0.6, w: 0.15, h: 4.9,
      fill: { color: COLORS.primaryLight },
    });

    // Title
    slide.addText(info.title, {
      x: 1, y: 1.5, w: 8, h: 1.2,
      fontSize: 34,
      bold: true,
      color: COLORS.text,
      fontFace: FONTS.korean,
      align: 'left',
    });

    // Subtitle / idea
    if (info.idea) {
      slide.addText(info.idea.substring(0, 100), {
        x: 1, y: 2.8, w: 8, h: 0.8,
        fontSize: 16,
        color: COLORS.textSecondary,
        fontFace: FONTS.korean,
        align: 'left',
      });
    }

    // Divider line
    slide.addShape('rect' as any, {
      x: 1, y: 3.8, w: 3, h: 0.04,
      fill: { color: COLORS.primary },
    });

    // Date & Company
    const dateLine = info.date || new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const companyLine = info.company || '';
    slide.addText(`${dateLine}${companyLine ? '\n' + companyLine : ''}`, {
      x: 1, y: 4.0, w: 8, h: 0.7,
      fontSize: 13,
      color: COLORS.gray,
      fontFace: FONTS.korean,
      align: 'left',
    });

    // "Plan-Craft" branding (bottom right)
    slide.addText('Plan-Craft AI', {
      x: 7, y: 4.8, w: 2.5, h: 0.4,
      fontSize: 10,
      color: COLORS.primaryLight,
      fontFace: FONTS.english,
      align: 'right',
      italic: true,
    });
  }

  /**
   * 목차 슬라이드 생성
   */
  private createTocSlide(pres: PptxGenJS, slides: SlideData[], pageNum: number): void {
    const slide = pres.addSlide();
    this.addHeaderBar(slide, pageNum);

    slide.addText('목차', {
      x: 0.7, y: 0.6, w: 8, h: 0.7,
      fontSize: 26,
      bold: true,
      color: COLORS.primary,
      fontFace: FONTS.korean,
    });

    const tocItems = slides.map((s, i) => ({
      text: `${String(i + 1).padStart(2, '0')}  ${s.sectionTitle}`,
      options: {
        fontSize: 14,
        color: COLORS.text,
        fontFace: FONTS.korean,
        bullet: false,
        lineSpacing: 28,
      } as PptxGenJS.TextPropsOptions,
    }));

    slide.addText(tocItems, {
      x: 0.7, y: 1.5, w: 8.5, h: 3.5,
    });
  }

  /**
   * 내용 슬라이드 생성
   */
  private createContentSlide(pres: PptxGenJS, data: SlideData, pageNum: number): void {
    const slide = pres.addSlide();
    this.addHeaderBar(slide, pageNum);

    // Section title
    slide.addText(data.sectionTitle, {
      x: 0.7, y: 0.6, w: 8.5, h: 0.7,
      fontSize: 22,
      bold: true,
      color: COLORS.primaryDark,
      fontFace: FONTS.korean,
    });

    // Accent underline
    slide.addShape('rect' as any, {
      x: 0.7, y: 1.25, w: 2, h: 0.04,
      fill: { color: COLORS.accent },
    });

    // Bullet points
    if (data.bullets && data.bullets.length > 0) {
      const bulletTexts = data.bullets.map(b => ({
        text: b,
        options: {
          fontSize: 15,
          color: COLORS.text,
          fontFace: FONTS.korean,
          bullet: { code: '25CF', color: COLORS.primary } as any,
          lineSpacing: 32,
          paraSpaceBefore: 6,
        } as PptxGenJS.TextPropsOptions,
      }));

      const bulletWidth = data.hasTable && data.tableData ? 4.5 : 8.5;
      slide.addText(bulletTexts, {
        x: 0.7, y: 1.5, w: bulletWidth, h: 3.2,
        valign: 'top',
      });
    }

    // Key data callout box
    if (data.keyData) {
      slide.addShape('roundRect' as any, {
        x: 0.7, y: 4.3, w: 8.5, h: 0.6,
        fill: { color: 'E8EAF6' },
        rectRadius: 0.1,
      });
      slide.addText(`📊 ${data.keyData}`, {
        x: 0.9, y: 4.35, w: 8.1, h: 0.5,
        fontSize: 11,
        color: COLORS.primaryDark,
        fontFace: FONTS.korean,
        italic: true,
      });
    }

    // Table (if present)
    if (data.hasTable && data.tableData && data.tableData.length > 0) {
      const rows: PptxGenJS.TableRow[] = data.tableData.map((row, rIdx) =>
        row.map(cell => ({
          text: cell,
          options: {
            fontSize: 10,
            color: rIdx === 0 ? COLORS.white : COLORS.text,
            bold: rIdx === 0,
            fill: { color: rIdx === 0 ? COLORS.primary : (rIdx % 2 === 0 ? COLORS.lightGray : COLORS.white) },
            fontFace: FONTS.korean,
            border: { pt: 0.5, color: 'BDBDBD' },
            align: 'left',
            valign: 'middle',
          } as PptxGenJS.TableCellProps,
        }))
      );

      const colCount = data.tableData[0]?.length || 1;
      const tableWidth = 4;
      const colW = Array(colCount).fill(tableWidth / colCount);

      slide.addTable(rows, {
        x: 5.3, y: 1.5, w: tableWidth, h: 2.5,
        colW,
        rowH: 0.35,
        border: { pt: 0.5, color: 'BDBDBD' },
      });
    }
  }

  /**
   * 요약/결론 슬라이드
   */
  private createSummarySlide(pres: PptxGenJS, info: PptProjectInfo, sectionCount: number, pageNum: number): void {
    const slide = pres.addSlide();
    this.addHeaderBar(slide, pageNum);

    slide.addText('요약 및 결론', {
      x: 0.7, y: 0.6, w: 8.5, h: 0.7,
      fontSize: 26,
      bold: true,
      color: COLORS.primary,
      fontFace: FONTS.korean,
    });

    slide.addShape('rect' as any, {
      x: 0.7, y: 1.3, w: 2, h: 0.04,
      fill: { color: COLORS.accent },
    });

    slide.addText([
      { text: `본 문서는 총 ${sectionCount}개 섹션으로 구성되었으며,\n`, options: { fontSize: 15, color: COLORS.text, fontFace: FONTS.korean } },
      { text: `"${info.title}"에 대한 종합적인 분석과 전략을 제시합니다.\n\n`, options: { fontSize: 15, color: COLORS.text, fontFace: FONTS.korean } },
      { text: '상세 내용은 함께 제공되는 문서를 참고해주세요.', options: { fontSize: 14, color: COLORS.textSecondary, fontFace: FONTS.korean } },
    ], {
      x: 0.7, y: 1.6, w: 8.5, h: 2.5,
      valign: 'top',
    });

    // Thank you box
    slide.addShape('roundRect' as any, {
      x: 2.5, y: 3.8, w: 5, h: 1,
      fill: { color: COLORS.primary },
      rectRadius: 0.15,
    });
    slide.addText('감사합니다', {
      x: 2.5, y: 3.8, w: 5, h: 1,
      fontSize: 24,
      bold: true,
      color: COLORS.white,
      fontFace: FONTS.korean,
      align: 'center',
      valign: 'middle',
    });
  }

  /**
   * 메인 생성 함수: 섹션 데이터로부터 PPTX Buffer 생성
   */
  async generatePptx(
    sections: PptSection[],
    projectInfo: PptProjectInfo
  ): Promise<{ buffer: Buffer; slideCount: number; slideData: SlideData[] }> {
    console.log(`🎨 [PptGenerator] Starting PPT generation for "${projectInfo.title}" (${sections.length} sections)`);

    // 1. AI로 섹션 요약
    const slideDataList = await this.summarizeSectionsForPpt(sections, projectInfo);

    // Attach sectionId from original sections
    slideDataList.forEach((slide, idx) => {
      if (idx < sections.length) {
        slide.sectionId = sections[idx].id;
      }
    });

    // Limit to MAX_SLIDES - 3 (cover + toc + summary)
    const maxContentSlides = MAX_SLIDES - 3;
    const trimmedSlides = slideDataList.slice(0, maxContentSlides);

    // 2. Create presentation
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'Plan-Craft AI';
    pres.title = projectInfo.title;
    pres.subject = projectInfo.idea || '';

    const totalPages = trimmedSlides.length + 3; // cover + toc + content + summary
    let pageNum = 1;

    // Cover slide
    this.createCoverSlide(pres, projectInfo);
    pageNum++;

    // TOC slide
    this.createTocSlide(pres, trimmedSlides, pageNum);
    pageNum++;

    // Content slides
    for (const slideData of trimmedSlides) {
      this.createContentSlide(pres, slideData, pageNum);
      pageNum++;
    }

    // Summary slide
    this.createSummarySlide(pres, projectInfo, sections.length, pageNum);

    // 3. Generate buffer
    const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer;

    console.log(`✅ [PptGenerator] PPT generated: ${totalPages} slides, ${(buffer.length / 1024).toFixed(0)}KB`);

    return { buffer, slideCount: totalPages, slideData: slideDataList };
  }
}
