/**
 * Slide Content Generator (v2)
 * 
 * 1회 Anthropic API 호출로 18장 슬라이드 콘텐츠 JSON 일괄 생성.
 * "AI는 콘텐츠만, 디자인은 템플릿 엔진이 담당"
 */

import Anthropic from '@anthropic-ai/sdk';

// ── Types ──────────────────────────────────────────────

export interface SlidePoint {
  icon: string;
  title: string;
  desc: string;
}

export interface SlideChartData {
  type: 'bar' | 'line' | 'pie' | 'donut';
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
  }>;
}

export interface SlideMetric {
  label: string;
  value: string;
  growth?: string;
}

export interface SlideQuestion {
  q: string;
  a: string;
}

export interface SlideTimelineItem {
  date: string;
  title: string;
  desc: string;
}

export interface SlideComparisonItem {
  label: string;
  points: string[];
}

export interface SlideJSON {
  pageNumber: number;
  type: string;
  title: string;
  subtitle?: string;
  date?: string;
  layout: string;
  points?: SlidePoint[];
  chartData?: SlideChartData;
  keyMetrics?: SlideMetric[];
  questions?: SlideQuestion[];
  summary?: string[];
  milestones?: SlideTimelineItem[];
  left?: SlideComparisonItem;
  right?: SlideComparisonItem;
  metrics?: SlideMetric[];
  content?: string;
}

export interface SlideContentResult {
  slides: SlideJSON[];
  tokens?: { input_tokens: number; output_tokens: number };
}

// ── Layout auto-mapping ────────────────────────────────

const TYPE_LAYOUT_MAP: Record<string, string> = {
  'cover': 'cover-hero',
  'overview': 'left-right-split',
  'market': 'chart-with-metrics',
  'technology': 'icon-grid',
  'architecture': 'left-right-split',
  'comparison': 'comparison',
  'timeline': 'timeline-horizontal',
  'data-cards': 'data-cards',
  'qa': 'qa-cards',
  'closing': 'closing-summary',
  'team': 'icon-grid',
  'revenue': 'chart-with-metrics',
  'strategy': 'left-right-split',
  'problem': 'left-right-split',
  'solution': 'icon-grid',
  'competitive': 'comparison',
  'roadmap': 'timeline-horizontal',
  'financials': 'data-cards',
  'traction': 'data-cards',
  'risks': 'icon-grid',
};

// ── Generator ──────────────────────────────────────────

export class SlideContentGenerator {
  private client: Anthropic;
  private model: string;

  constructor(options: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || 'claude-sonnet-4-5-20250929';
  }

  async generate(
    projectInfo: { title: string; idea?: string; category?: string },
    design: { structure: Array<{ title: string; subsections?: any[] }> },
    researchResult?: any
  ): Promise<SlideContentResult> {
    const sectionTitles = design.structure
      .flatMap(s => [s.title, ...(s.subsections || []).map((sub: any) => sub.title)])
      .filter(Boolean);

    const researchContext = researchResult?.summary
      ? `\n\n참고 리서치:\n${researchResult.summary}\n키워드: ${researchResult.keywords?.join(', ') || ''}`
      : '';

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a presentation content architect. Generate exactly 18 slides of structured JSON content for a Korean business/tech presentation. Output ONLY valid JSON, no markdown fences.

Rules:
- All text in Korean (except technical terms)
- Each slide must have: pageNumber, type, title, layout
- type must be one of: cover, overview, market, technology, architecture, comparison, timeline, data-cards, qa, closing, problem, solution, strategy, revenue, team, competitive, roadmap, financials, traction, risks
- layout is auto-assigned, just set it to the type name
- Include realistic numbers and data (market sizes, growth rates, etc.)
- chartData datasets must have backgroundColor array
- Q&A slide (#17) must have 3-5 realistic investor questions
- Closing slide (#18) must have 3 summary points
- Keep text concise: titles <20 chars, descriptions <60 chars`;

    const userPrompt = `프로젝트: "${projectInfo.title}"
아이디어: ${projectInfo.idea || projectInfo.title}
카테고리: ${projectInfo.category || '기술/IT'}
문서 섹션: ${sectionTitles.slice(0, 10).join(', ')}
${researchContext}
오늘 날짜: ${today}

Generate 18 slides JSON. Structure:
{
  "slides": [
    { "pageNumber": 1, "type": "cover", "title": "...", "subtitle": "...", "date": "${today}", "layout": "cover" },
    { "pageNumber": 2, "type": "overview", "title": "프로젝트 개요", "points": [{"icon":"...", "title":"...", "desc":"..."}], "layout": "overview" },
    ... (market with chartData+keyMetrics, technology with points, etc.)
    { "pageNumber": 17, "type": "qa", "title": "예상 Q&A", "questions": [{"q":"...", "a":"..."}], "layout": "qa" },
    { "pageNumber": 18, "type": "closing", "title": "감사합니다", "summary": ["...", "...", "..."], "layout": "closing" }
  ]
}`;

    console.log('🎯 SlideContentGenerator: 1회 API 호출로 18장 콘텐츠 생성 중...');
    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ SlideContentGenerator: ${elapsed}초 소요`);

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Parse JSON (handle possible markdown fences)
    const jsonStr = text.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
    let parsed: { slides: SlideJSON[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON object
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('SlideContentGenerator: Failed to parse JSON response');
      }
    }

    // Auto-map layouts
    parsed.slides = parsed.slides.map(slide => ({
      ...slide,
      layout: TYPE_LAYOUT_MAP[slide.type] || slide.layout || 'left-right-split',
    }));

    return {
      slides: parsed.slides,
      tokens: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
      },
    };
  }
}
