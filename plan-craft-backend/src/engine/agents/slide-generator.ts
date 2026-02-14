/**
 * Slide Generator Agent (슬라이드 생성 에이전트)
 * 
 * GenSpark 스타일 25페이지 HTML 프레젠테이션 생성
 * AI가 슬라이드 구조 설계 → QuickChart + DALL-E로 비주얼 생성
 */

import Anthropic from '@anthropic-ai/sdk';
import { QuickChartService } from '../services/quickchart';
import { DalleV2Service } from '../services/dalle-v2';

// ── Types ──────────────────────────────────────────────
export type SlideLayout =
  | 'title' | 'two-column' | 'chart' | 'icon-grid'
  | 'timeline' | 'comparison' | 'quote' | 'data-cards';

export interface KpiCard {
  label: string;
  value: string;
  change?: string;
}

export interface IconBox {
  icon: string; // emoji or SVG path
  title: string;
  description: string;
}

export interface SlideChartData {
  type: 'bar' | 'line' | 'pie' | 'donut';
  labels: string[];
  datasets: Array<{ label: string; data: number[] }>;
}

export interface SlideContent {
  mainText?: string;
  bullets?: string[];
  kpiCards?: KpiCard[];
  chartData?: SlideChartData;
  iconBoxes?: IconBox[];
  tableData?: { headers: string[]; rows: string[][] };
}

export interface SlideData {
  pageNumber: number;
  title: string;
  subtitle?: string;
  layout: SlideLayout;
  content: SlideContent;
  diagramUrl?: string;   // DALL-E generated
  chartUrl?: string;     // QuickChart URL
  sectionId?: string;    // maps to document section
}

export interface SlideGeneratorConfig {
  apiKey: string;
  model?: string;
  openaiKey?: string;
  maxDalleImages?: number;
}

export interface SlideGeneratorResult {
  slides: SlideData[];
  presentationHtml: string;
  slideCount: number;
  tokens: any;
}

// ── Design Constants ──────────────────────────────────
const THEME = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  secondary: '#10B981',
  accent: '#F59E0B',
  text: '#1E293B',
  textLight: '#64748B',
  bg: '#FFFFFF',
  bgLight: '#F8FAFC',
  bgGradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
};

// ── SVG Icons (inline, Lucide style) ──────────────────
const ICONS: Record<string, string> = {
  '📊': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.primary}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 16V12M12 16V8M16 16V11"/></svg>`,
  '🎯': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.primary}" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  '💡': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.accent}" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>`,
  '🚀': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.secondary}" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`,
  '⚡': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.accent}" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  '🔒': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.primary}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  '🌐': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.secondary}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  '👥': `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${THEME.primary}" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
};

function getIconSvg(emoji: string): string {
  return ICONS[emoji] || ICONS['📊'];
}

export class SlideGeneratorAgent {
  private anthropic: Anthropic;
  private model: string;
  private quickChart: QuickChartService;
  private dalle: DalleV2Service;
  private maxDalleImages: number;

  constructor(config: SlideGeneratorConfig) {
    this.anthropic = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.quickChart = new QuickChartService(700, 420);
    this.dalle = new DalleV2Service({ apiKey: config.openaiKey });
    this.maxDalleImages = config.maxDalleImages || 8;
  }

  /**
   * Main entry: generate 25-page slide deck from architect design + research data
   */
  async generateSlides(
    design: any,
    researchData: any,
    projectInfo: { title: string; idea?: string; company?: string },
  ): Promise<SlideGeneratorResult> {
    console.log('\n🎨 [SlideGenerator] 25페이지 프레젠테이션 생성 시작...');

    // Step 1: AI generates slide structure (JSON)
    const slidePlan = await this.planSlides(design, researchData, projectInfo);

    // Step 2: Generate visuals (QuickChart + DALL-E)
    const slides = await this.generateVisuals(slidePlan);

    // Step 3: Build presentation HTML
    const presentationHtml = this.buildPresentationHtml(slides, projectInfo);

    console.log(`   ✅ 프레젠테이션 완료: ${slides.length}장 슬라이드`);

    return {
      slides,
      presentationHtml,
      slideCount: slides.length,
      tokens: slidePlan.tokens,
    };
  }

  /**
   * Step 1: AI plans slide structure
   */
  private async planSlides(
    design: any,
    researchData: any,
    projectInfo: { title: string; idea?: string },
  ): Promise<{ slides: SlideData[]; tokens: any }> {
    const sectionTitles = design.structure
      .flatMap((s: any) => [s.title, ...(s.subsections || []).map((sub: any) => sub.title)])
      .join('\n- ');

    const researchSummary = researchData?.summary
      ? researchData.summary.slice(0, 2000)
      : '리서치 데이터 없음';

    const systemPrompt = `당신은 GenSpark/Skywork 수준의 프레젠테이션 슬라이드를 설계하는 전문가입니다.

## 설계 원칙 (GenSpark 패턴)
1. 한 페이지 = 하나의 메시지
2. 핵심 KPI는 큰 숫자로 강조 (font-size 48px+)
3. 비주얼 비중 > 텍스트 비중 (6:4)
4. 모든 주장에 수치 근거
5. 색상: 주색 #2563EB, 보조 #10B981, 강조 #F59E0B
6. 텍스트 최소화, 비주얼 최대화

## 출력 형식
정확히 25개 슬라이드를 JSON 배열로 출력하세요.
마크다운 코드블록 없이 순수 JSON만 출력.

각 슬라이드:
{
  "pageNumber": 1,
  "title": "슬라이드 제목",
  "subtitle": "부제목 (선택)",
  "layout": "title|two-column|chart|icon-grid|timeline|comparison|quote|data-cards",
  "content": {
    "mainText": "핵심 메시지 (1-2문장)",
    "bullets": ["포인트1", "포인트2"],
    "kpiCards": [{"label":"시장규모","value":"3.2조원","change":"+12.5%"}],
    "chartData": {"type":"bar|line|pie|donut","labels":["A","B"],"datasets":[{"label":"매출","data":[100,200]}]},
    "iconBoxes": [{"icon":"🎯","title":"목표","description":"설명"}],
    "tableData": {"headers":["항목","값"],"rows":[["A","100"]]}
  },
  "needsDalleDiagram": false,
  "dalleCategory": "system-architecture|process-flow|concept-diagram|market-overview|comparison|roadmap|team-org|technology",
  "dalleDescription": "DALL-E에 요청할 이미지 설명"
}

## 슬라이드 순서 (필수)
1. 표지 (title)
2. 목차 (icon-grid)
3-4. 기업/프로젝트 개요 (two-column, data-cards)
5-6. 핵심 역량/기술 (icon-grid, two-column)
7-8. 실적/성과 (chart, data-cards)
9-11. 시장 분석 (chart, comparison, data-cards)
12-14. 솔루션/제품 (two-column, icon-grid, timeline)
15-17. 사업 계획 (timeline, two-column, chart)
18-20. 재무 계획 (chart, data-cards, comparison)
21-22. 팀/조직 (icon-grid, two-column)
23. 리스크 관리 (comparison)
24. Q&A (quote)
25. 결론/감사 (title)

## 차트 데이터 규칙 (매우 중요!!!)
- **최소 8개 슬라이드에 chartData를 반드시 포함하세요** (chart 레이아웃 + 일부 two-column/data-cards)
- chartData가 있으면 반드시 실제 수치 데이터 포함
- 시장 규모, 매출 전망, 성장률, 비용 구조, 시장 점유율 등 구체적 숫자
- labels는 연도나 카테고리명
- chartData 예시:
  - 시장규모: {"type":"bar","labels":["2023","2024","2025","2026","2027"],"datasets":[{"label":"시장 규모(억원)","data":[1200,1500,1900,2400,3100]}]}
  - 성장률: {"type":"line","labels":["1년차","2년차","3년차","4년차","5년차"],"datasets":[{"label":"매출 성장률(%)","data":[15,35,65,120,200]}]}
  - 비중: {"type":"pie","labels":["B2B","B2C","B2G","기타"],"datasets":[{"label":"매출 비중","data":[45,30,15,10]}]}
  - 재무: {"type":"bar","labels":["2025","2026","2027"],"datasets":[{"label":"매출(억원)","data":[50,150,400]},{"label":"영업이익(억원)","data":[-20,30,120]}]}

## DALL-E 이미지 규칙 (매우 중요!!!)
- **최소 5개 슬라이드에 needsDalleDiagram: true를 반드시 설정하세요**
- 전체 25장 중 최대 8장에 사용 가능
- 시스템 구조도, 프로세스 플로우, 개념 다이어그램, 기술 스택, 시장 개요에 사용
- dalleDescription에 구체적 설명 필수 (영어로 작성하면 더 좋음)
- dalleCategory는 반드시 다음 중 하나: system-architecture, process-flow, concept-diagram, market-overview, comparison, roadmap, team-org, technology

## 필수 확인사항
- chartData가 있는 슬라이드: 최소 8개 (chart 레이아웃 6개 + 기타 2개)
- needsDalleDiagram: true인 슬라이드: 최소 5개
- 이 조건을 충족하지 않으면 출력이 거부됩니다`;

    const userPrompt = `프로젝트: ${projectInfo.title}
아이디어: ${(projectInfo.idea || '').slice(0, 500)}

문서 구조:
- ${sectionTitles}

리서치 데이터:
${researchSummary}

위 정보를 바탕으로 25장 슬라이드를 설계하세요. 순수 JSON 배열만 출력.`;

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 12000,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (message.content[0] as any).text;
    let jsonStr = text.trim();
    
    // Extract JSON array
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonStr = arrayMatch[0];
    
    let slides: SlideData[];
    try {
      slides = JSON.parse(jsonStr);
    } catch {
      // Try fixing common issues
      try {
        const fixed = jsonStr.replace(/,\s*\]/, ']').replace(/,\s*\}/, '}');
        slides = JSON.parse(fixed);
      } catch {
        console.warn('   ⚠️  Slide plan JSON parse failed, using fallback');
        slides = this.fallbackSlides(projectInfo);
      }
    }

    // Ensure 25 slides max
    if (slides.length > 25) slides = slides.slice(0, 25);

    // Post-parse validation & logging
    const chartCount = slides.filter((s: any) => s.content?.chartData).length;
    const dalleCount = slides.filter((s: any) => s.needsDalleDiagram).length;
    console.log(`   📋 슬라이드 계획: ${slides.length}장 (chartData: ${chartCount}개, needsDalleDiagram: ${dalleCount}개)`);
    console.log(`   🔍 DALL-E isAvailable: ${this.dalle.isAvailable()}`);
    
    // Log each slide's visual status
    slides.forEach((s: any, i: number) => {
      const hasChart = !!s.content?.chartData;
      const hasDalle = !!s.needsDalleDiagram;
      if (hasChart || hasDalle) {
        console.log(`      Slide ${s.pageNumber || i+1} [${s.layout}]: chart=${hasChart}, dalle=${hasDalle}`);
      }
    });
    return { slides, tokens: message.usage };
  }

  /**
   * Step 2: Generate visuals (QuickChart URLs + DALL-E images)
   */
  private async generateVisuals(plan: { slides: SlideData[]; tokens: any }): Promise<SlideData[]> {
    let dalleCount = 0;
    const slides: SlideData[] = [];

    for (const slide of plan.slides) {
      // Generate QuickChart URL if chartData exists
      if (slide.content?.chartData) {
        const cd = slide.content.chartData;
        try {
          const chartType = cd.type === 'donut' ? 'doughnut' : cd.type;
          slide.chartUrl = this.quickChart.getChartUrl({
            type: chartType as any,
            data: {
              labels: cd.labels || [],
              datasets: (cd.datasets || []).map(ds => ({
                label: ds.label,
                data: ds.data,
              })),
            },
          });
          console.log(`   📊 Chart URL generated for slide ${slide.pageNumber}`);
        } catch (e: any) {
          console.warn(`   ⚠️  Chart generation failed for slide ${slide.pageNumber}: ${e.message}`);
        }
      }

      // Generate DALL-E image if needed and budget allows
      if ((slide as any).needsDalleDiagram && dalleCount < this.maxDalleImages && this.dalle.isAvailable()) {
        try {
          const category = (slide as any).dalleCategory || 'concept-diagram';
          const description = (slide as any).dalleDescription || slide.title;
          const result = await this.dalle.generateDiagram(description, category);
          slide.diagramUrl = result.url;
          dalleCount++;
          console.log(`   🎨 DALL-E image ${dalleCount}/${this.maxDalleImages} for slide ${slide.pageNumber}`);
        } catch (e: any) {
          console.warn(`   ⚠️  DALL-E failed for slide ${slide.pageNumber}: ${e.message}`);
        }
      }

      slides.push(slide);
    }

    console.log(`   📈 Visuals (before ensure): ${slides.filter(s => s.chartUrl).length} charts, ${dalleCount} DALL-E images`);
    
    // Post-process: ensure visuals for slides that should have them
    const ensured = await this.ensureVisuals(slides, dalleCount);
    
    console.log(`   📈 Visuals (final): ${ensured.filter(s => s.chartUrl).length} charts, ${ensured.filter(s => s.diagramUrl).length} DALL-E/diagrams`);
    return ensured;
  }

  /**
   * Post-processing: auto-generate visuals for slides missing them
   */
  private async ensureVisuals(slides: SlideData[], currentDalleCount: number): Promise<SlideData[]> {
    let dalleCount = currentDalleCount;

    // Chart keyword mapping for auto-generation
    const chartKeywordMap: Array<{ keywords: string[]; type: 'bar' | 'line' | 'pie'; generator: (title: string) => SlideChartData }> = [
      {
        keywords: ['시장', 'market', '규모', 'TAM', 'SAM'],
        type: 'bar',
        generator: (title) => ({
          type: 'bar',
          labels: ['2023', '2024', '2025', '2026', '2027'],
          datasets: [{ label: '시장 규모(억원)', data: [800, 1100, 1500, 2000, 2700] }],
        }),
      },
      {
        keywords: ['성장', 'growth', '추이', '전망', '예측'],
        type: 'line',
        generator: (title) => ({
          type: 'line',
          labels: ['1년차', '2년차', '3년차', '4년차', '5년차'],
          datasets: [{ label: '성장률(%)', data: [20, 45, 80, 130, 200] }],
        }),
      },
      {
        keywords: ['비중', '분포', '점유', 'share', '구성', '비율'],
        type: 'pie',
        generator: (title) => ({
          type: 'pie',
          labels: ['핵심 서비스', '부가 서비스', '기타'],
          datasets: [{ label: '비중', data: [55, 30, 15] }],
        }),
      },
      {
        keywords: ['재무', '매출', '수익', 'revenue', '손익', '비용'],
        type: 'bar',
        generator: (title) => ({
          type: 'bar',
          labels: ['2025', '2026', '2027'],
          datasets: [
            { label: '매출(억원)', data: [30, 120, 350] },
            { label: '영업이익(억원)', data: [-15, 25, 100] },
          ],
        }),
      },
      {
        keywords: ['투자', 'investment', '자금', '펀딩'],
        type: 'bar',
        generator: (title) => ({
          type: 'bar',
          labels: ['시드', '시리즈A', '시리즈B'],
          datasets: [{ label: '투자 규모(억원)', data: [5, 30, 100] }],
        }),
      },
    ];

    // DALL-E category keyword mapping
    const dalleKeywordMap: Array<{ keywords: string[]; category: string }> = [
      { keywords: ['시스템', '아키텍처', 'system', 'architecture', '기술', '플랫폼'], category: 'system-architecture' },
      { keywords: ['프로세스', '흐름', 'flow', 'process', '절차', '워크플로우'], category: 'process-flow' },
      { keywords: ['개념', 'concept', '비전', 'vision', '핵심', '전략'], category: 'concept-diagram' },
      { keywords: ['시장', 'market', '분석', '현황', '트렌드'], category: 'market-overview' },
      { keywords: ['비교', 'comparison', '경쟁', '차별', '대비'], category: 'comparison' },
      { keywords: ['로드맵', 'roadmap', '일정', '마일스톤', '계획'], category: 'roadmap' },
      { keywords: ['팀', 'team', '조직', '인력', '구성원'], category: 'team-org' },
      { keywords: ['기술', 'technology', 'tech', 'AI', '솔루션'], category: 'technology' },
    ];

    for (const slide of slides) {
      const titleLower = (slide.title || '').toLowerCase();

      // Auto-generate chart for chart-layout slides without chartUrl
      if (!slide.chartUrl && (slide.layout === 'chart' || slide.layout === 'data-cards' || slide.layout === 'comparison')) {
        const matched = chartKeywordMap.find(m => m.keywords.some(k => titleLower.includes(k.toLowerCase())));
        if (matched) {
          slide.content = slide.content || {};
          slide.content.chartData = matched.generator(slide.title);
          try {
            const cd = slide.content.chartData;
            const chartType = cd.type === 'donut' ? 'doughnut' : cd.type;
            slide.chartUrl = this.quickChart.getChartUrl({
              type: chartType as any,
              data: {
                labels: cd.labels || [],
                datasets: (cd.datasets || []).map(ds => ({ label: ds.label, data: ds.data })),
              },
            });
            console.log(`   📊 Auto-chart generated for slide ${slide.pageNumber}: "${slide.title}"`);
          } catch (e: any) {
            console.warn(`   ⚠️  Auto-chart failed for slide ${slide.pageNumber}: ${e.message}`);
          }
        }
      }

      // Auto-generate DALL-E for two-column/icon-grid slides without diagramUrl
      if (!slide.diagramUrl && !slide.chartUrl && dalleCount < this.maxDalleImages && this.dalle.isAvailable()) {
        if (slide.layout === 'two-column' || slide.layout === 'icon-grid') {
          const matched = dalleKeywordMap.find(m => m.keywords.some(k => titleLower.includes(k.toLowerCase())));
          if (matched) {
            try {
              const result = await this.dalle.generateDiagram(slide.title, matched.category);
              slide.diagramUrl = result.url;
              dalleCount++;
              console.log(`   🎨 Auto-DALL-E ${dalleCount}/${this.maxDalleImages} for slide ${slide.pageNumber}: "${slide.title}" [${matched.category}]`);
            } catch (e: any) {
              console.warn(`   ⚠️  Auto-DALL-E failed for slide ${slide.pageNumber}: ${e.message}`);
            }
          }
        }
      }
    }

    return slides;
  }

  /**
   * Step 3: Build full presentation HTML (16:9 slides, navigation)
   */
  buildPresentationHtml(slides: SlideData[], projectInfo: { title: string; company?: string }): string {
    const slideHtmls = slides.map(s => this.renderSlide(s, projectInfo)).join('\n');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${projectInfo.title} - 프레젠테이션</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0f172a; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif; }
  
  .slide-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
  .slide {
    display: none; width: 960px; height: 540px; background: ${THEME.bg};
    border-radius: 12px; box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    padding: 48px 56px; position: relative; overflow: hidden;
  }
  .slide.active { display: flex; flex-direction: column; }
  
  /* Layouts */
  .slide-title { justify-content: center; align-items: center; text-align: center; background: ${THEME.bgGradient}; }
  .slide-title h1 { font-size: 42px; color: ${THEME.primaryDark}; margin-bottom: 16px; font-weight: 800; }
  .slide-title .subtitle { font-size: 20px; color: ${THEME.textLight}; }
  .slide-title .date { font-size: 14px; color: ${THEME.textLight}; margin-top: 32px; }
  
  .slide h2 { font-size: 28px; color: ${THEME.text}; font-weight: 700; margin-bottom: 24px; border-bottom: 3px solid ${THEME.primary}; padding-bottom: 8px; }
  .slide .subtitle-line { font-size: 14px; color: ${THEME.textLight}; margin-top: -20px; margin-bottom: 20px; }
  
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; flex: 1; }
  .col { display: flex; flex-direction: column; justify-content: center; }
  .col img { max-width: 100%; max-height: 320px; border-radius: 8px; object-fit: contain; }
  
  .bullets { list-style: none; padding: 0; }
  .bullets li { padding: 8px 0; font-size: 16px; color: ${THEME.text}; border-bottom: 1px solid #E2E8F0; display: flex; align-items: flex-start; gap: 8px; }
  .bullets li:last-child { border-bottom: none; }
  .bullet-dot { width: 8px; height: 8px; border-radius: 50%; background: ${THEME.primary}; margin-top: 7px; flex-shrink: 0; }
  
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; flex: 1; align-content: center; }
  .kpi-card { background: ${THEME.bgLight}; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #E2E8F0; }
  .kpi-value { font-size: 42px; font-weight: 800; color: ${THEME.primary}; }
  .kpi-label { font-size: 14px; color: ${THEME.textLight}; margin-top: 4px; }
  .kpi-change { font-size: 13px; color: ${THEME.secondary}; margin-top: 4px; font-weight: 600; }
  .kpi-change.negative { color: #EF4444; }
  
  .icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; flex: 1; align-content: center; }
  .icon-box { background: ${THEME.bgLight}; border-radius: 12px; padding: 20px; border: 1px solid #E2E8F0; }
  .icon-box .icon { font-size: 28px; margin-bottom: 8px; }
  .icon-box h3 { font-size: 16px; color: ${THEME.text}; font-weight: 700; margin-bottom: 6px; }
  .icon-box p { font-size: 13px; color: ${THEME.textLight}; line-height: 1.5; }
  
  .chart-container { flex: 1; display: flex; align-items: center; justify-content: center; }
  .chart-container img { max-width: 100%; max-height: 380px; border-radius: 8px; }
  
  .timeline { display: flex; gap: 0; flex: 1; align-items: center; position: relative; padding: 40px 0; }
  .timeline::before { content: ''; position: absolute; top: 50%; left: 5%; right: 5%; height: 3px; background: ${THEME.primary}; }
  .tl-item { flex: 1; text-align: center; position: relative; z-index: 1; }
  .tl-dot { width: 16px; height: 16px; border-radius: 50%; background: ${THEME.primary}; margin: 0 auto 12px; border: 3px solid white; box-shadow: 0 0 0 2px ${THEME.primary}; }
  .tl-title { font-size: 14px; font-weight: 700; color: ${THEME.text}; }
  .tl-desc { font-size: 12px; color: ${THEME.textLight}; margin-top: 4px; }
  
  .comparison-table { width: 100%; border-collapse: collapse; flex: 1; }
  .comparison-table th { background: ${THEME.primary}; color: white; padding: 12px 16px; font-size: 14px; text-align: left; }
  .comparison-table td { padding: 10px 16px; font-size: 14px; border-bottom: 1px solid #E2E8F0; }
  .comparison-table tr:nth-child(even) td { background: ${THEME.bgLight}; }
  
  .quote-slide { justify-content: center; align-items: center; text-align: center; background: ${THEME.bgGradient}; }
  .quote-text { font-size: 28px; color: ${THEME.primaryDark}; font-weight: 600; max-width: 700px; line-height: 1.6; }
  .quote-author { font-size: 16px; color: ${THEME.textLight}; margin-top: 24px; }
  
  .main-text { font-size: 16px; color: ${THEME.text}; line-height: 1.7; margin-bottom: 16px; }
  
  /* Page number */
  .page-num { position: absolute; bottom: 16px; right: 24px; font-size: 12px; color: ${THEME.textLight}; }
  .page-bar { position: absolute; bottom: 0; left: 0; height: 4px; background: ${THEME.primary}; transition: width 0.3s; }
  
  /* Navigation */
  .nav { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; z-index: 100; }
  .nav button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .nav .prev, .nav .next { background: ${THEME.primary}; color: white; }
  .nav .prev:hover, .nav .next:hover { background: ${THEME.primaryDark}; }
  .nav .counter { background: rgba(255,255,255,0.1); color: white; pointer-events: none; }
  
  @media print {
    body { background: white; overflow: visible; }
    .slide-container { page-break-after: always; height: auto; }
    .slide { display: flex !important; box-shadow: none; border: 1px solid #E2E8F0; margin: 0 auto; }
    .nav { display: none; }
  }
</style>
</head>
<body>
<div class="slide-container">
${slideHtmls}
</div>

<div class="nav">
  <button class="prev" onclick="navigate(-1)">◀ 이전</button>
  <button class="counter" id="counter">1 / ${slides.length}</button>
  <button class="next" onclick="navigate(1)">다음 ▶</button>
</div>

<script>
let current = 0;
const slides = document.querySelectorAll('.slide');
const counter = document.getElementById('counter');
const total = slides.length;

function showSlide(n) {
  slides.forEach(s => s.classList.remove('active'));
  current = ((n % total) + total) % total;
  slides[current].classList.add('active');
  counter.textContent = (current + 1) + ' / ' + total;
}

function navigate(d) { showSlide(current + d); }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); navigate(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
  if (e.key === 'Home') showSlide(0);
  if (e.key === 'End') showSlide(total - 1);
});

showSlide(0);
</script>
</body>
</html>`;
  }

  /**
   * Render a single slide to HTML
   */
  private renderSlide(slide: SlideData, projectInfo: { title: string; company?: string }): string {
    const c = slide.content || {};
    const pn = slide.pageNumber || 0;
    const total = 25;
    const progressWidth = Math.round((pn / total) * 100);

    let inner = '';

    switch (slide.layout) {
      case 'title':
        return `<div class="slide slide-title" data-slide="${pn}">
  <h1>${esc(slide.title)}</h1>
  ${slide.subtitle ? `<div class="subtitle">${esc(slide.subtitle)}</div>` : ''}
  <div class="date">${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="page-bar" style="width:${progressWidth}%"></div>
</div>`;

      case 'data-cards':
        inner = `<h2>${esc(slide.title)}</h2>
  ${c.mainText ? `<p class="main-text">${esc(c.mainText)}</p>` : ''}
  <div class="kpi-grid">
    ${(c.kpiCards || []).map(k => `<div class="kpi-card">
      <div class="kpi-value">${esc(k.value)}</div>
      <div class="kpi-label">${esc(k.label)}</div>
      ${k.change ? `<div class="kpi-change ${k.change.startsWith('-') ? 'negative' : ''}">${esc(k.change)}</div>` : ''}
    </div>`).join('\n    ')}
  </div>`;
        break;

      case 'chart':
        inner = `<h2>${esc(slide.title)}</h2>
  ${c.mainText ? `<p class="main-text">${esc(c.mainText)}</p>` : ''}
  <div class="chart-container">
    ${slide.chartUrl ? `<img src="${slide.chartUrl}" alt="${esc(slide.title)}" />` : '<p>차트 생성 중...</p>'}
  </div>`;
        break;

      case 'icon-grid':
        inner = `<h2>${esc(slide.title)}</h2>
  <div class="icon-grid">
    ${(c.iconBoxes || []).map(ib => `<div class="icon-box">
      <div class="icon">${ib.icon}</div>
      <h3>${esc(ib.title)}</h3>
      <p>${esc(ib.description)}</p>
    </div>`).join('\n    ')}
  </div>`;
        break;

      case 'two-column':
        inner = `<h2>${esc(slide.title)}</h2>
  <div class="two-col">
    <div class="col">
      ${c.mainText ? `<p class="main-text">${esc(c.mainText)}</p>` : ''}
      ${c.bullets ? `<ul class="bullets">${c.bullets.map(b => `<li><span class="bullet-dot"></span>${esc(b)}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="col">
      ${slide.diagramUrl ? `<img src="${slide.diagramUrl}" alt="${esc(slide.title)}" />` :
        slide.chartUrl ? `<img src="${slide.chartUrl}" alt="${esc(slide.title)}" />` :
        c.kpiCards ? `<div class="kpi-grid" style="grid-template-columns:1fr">${(c.kpiCards || []).map(k => `<div class="kpi-card"><div class="kpi-value">${esc(k.value)}</div><div class="kpi-label">${esc(k.label)}</div></div>`).join('')}</div>` : ''}
    </div>
  </div>`;
        break;

      case 'timeline':
        inner = `<h2>${esc(slide.title)}</h2>
  <div class="timeline">
    ${(c.bullets || []).map((b, i) => `<div class="tl-item">
      <div class="tl-dot"></div>
      <div class="tl-title">${esc(b)}</div>
    </div>`).join('\n    ')}
  </div>`;
        break;

      case 'comparison':
        if (c.tableData) {
          inner = `<h2>${esc(slide.title)}</h2>
  <table class="comparison-table">
    <thead><tr>${c.tableData.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${(c.tableData.rows || []).map(r => `<tr>${r.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
        } else {
          inner = `<h2>${esc(slide.title)}</h2>
  ${c.bullets ? `<ul class="bullets">${c.bullets.map(b => `<li><span class="bullet-dot"></span>${esc(b)}</li>`).join('')}</ul>` : ''}`;
        }
        break;

      case 'quote':
        return `<div class="slide quote-slide" data-slide="${pn}">
  <div class="quote-text">"${esc(c.mainText || slide.title)}"</div>
  ${slide.subtitle ? `<div class="quote-author">— ${esc(slide.subtitle)}</div>` : ''}
  <div class="page-num">${pn} / ${total}</div>
  <div class="page-bar" style="width:${progressWidth}%"></div>
</div>`;

      default:
        inner = `<h2>${esc(slide.title)}</h2>
  ${c.mainText ? `<p class="main-text">${esc(c.mainText)}</p>` : ''}
  ${c.bullets ? `<ul class="bullets">${c.bullets.map(b => `<li><span class="bullet-dot"></span>${esc(b)}</li>`).join('')}</ul>` : ''}`;
    }

    return `<div class="slide" data-slide="${pn}">
  ${inner}
  <div class="page-num">${pn} / ${total}</div>
  <div class="page-bar" style="width:${progressWidth}%"></div>
</div>`;
  }

  /**
   * Fallback slide plan if AI fails
   */
  private fallbackSlides(projectInfo: { title: string; idea?: string }): SlideData[] {
    return [
      { pageNumber: 1, title: projectInfo.title, subtitle: projectInfo.idea, layout: 'title', content: {} },
      { pageNumber: 2, title: '목차', layout: 'icon-grid', content: { iconBoxes: [
        { icon: '📊', title: '시장 분석', description: '시장 현황 및 기회' },
        { icon: '🎯', title: '핵심 전략', description: '사업 전략 및 목표' },
        { icon: '💡', title: '솔루션', description: '제품/서비스 소개' },
        { icon: '🚀', title: '실행 계획', description: '로드맵 및 일정' },
      ]}},
      ...Array.from({ length: 22 }, (_, i) => ({
        pageNumber: i + 3,
        title: `섹션 ${i + 1}`,
        layout: 'two-column' as SlideLayout,
        content: { mainText: '내용 생성 중...', bullets: ['포인트 1', '포인트 2', '포인트 3'] },
      })),
      { pageNumber: 25, title: '감사합니다', subtitle: 'Q&A', layout: 'title' as SlideLayout, content: {} },
    ];
  }
}

function esc(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
