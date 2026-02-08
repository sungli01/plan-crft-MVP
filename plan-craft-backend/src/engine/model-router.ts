/**
 * Smart Model Router — routes tasks to optimal models based on complexity/importance
 */

export const MODEL_TIERS = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-3-5-haiku-20241022',
} as const;

export type ModelTier = typeof MODEL_TIERS[keyof typeof MODEL_TIERS];

export interface ModelPricing {
  input: number;
  output: number;
}

// Per-token pricing (USD)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  [MODEL_TIERS.opus]:   { input: 0.000005, output: 0.000025 },
  [MODEL_TIERS.sonnet]: { input: 0.000003, output: 0.000015 },
  [MODEL_TIERS.haiku]:  { input: 0.0000008, output: 0.000004 },
};

export type SectionImportance = 'core' | 'standard' | 'simple';

// Section importance classification
export const SECTION_IMPORTANCE: Record<SectionImportance, string[]> = {
  core: [
    '시장 분석', '사업 전략', '비즈니스 모델', '경쟁 분석',
    '기술 현황', '재무 계획', '투자 포인트',
  ],
  standard: [
    '사업 개요', '추진 체계', '조직 구성', '일정',
    '마일스톤', '인력', '협력',
  ],
  simple: [
    '부록', '참고자료', '첨부', '용어 정의', '약어', '색인',
  ],
};

export interface TokenBudget {
  maxTokens: number;
  targetChars: number;
}

export interface ModelRouterConfig {
  proMode?: boolean;
}

export class ModelRouter {
  proMode: boolean;
  defaultModel: string;

  constructor(config: ModelRouterConfig = {}) {
    this.proMode = config.proMode || false;
    this.defaultModel = this.proMode ? MODEL_TIERS.opus : MODEL_TIERS.sonnet;
  }

  // ──────────────────────────────────────────────
  // Section importance classification
  // ──────────────────────────────────────────────

  classifySection(sectionTitle: string): SectionImportance {
    const titleLower = sectionTitle.toLowerCase();

    for (const keyword of SECTION_IMPORTANCE.core) {
      if (titleLower.includes(keyword.toLowerCase())) return 'core';
    }
    for (const keyword of SECTION_IMPORTANCE.simple) {
      if (titleLower.includes(keyword.toLowerCase())) return 'simple';
    }
    for (const keyword of SECTION_IMPORTANCE.standard) {
      if (titleLower.includes(keyword.toLowerCase())) return 'standard';
    }
    return 'standard'; // default
  }

  // ──────────────────────────────────────────────
  // Model selection per agent
  // ──────────────────────────────────────────────

  getWriterModel(sectionTitle: string, sectionIndex: number, totalSections: number): string {
    const importance = this.classifySection(sectionTitle);

    if (importance === 'core') {
      return this.proMode ? MODEL_TIERS.opus : MODEL_TIERS.sonnet;
    }

    if (importance === 'simple') {
      return MODEL_TIERS.sonnet;
    }

    if (sectionIndex < 3 || sectionIndex >= totalSections - 2) {
      return this.proMode ? MODEL_TIERS.opus : MODEL_TIERS.sonnet;
    }

    return MODEL_TIERS.sonnet;
  }

  getArchitectModel(): string {
    return MODEL_TIERS.sonnet;
  }

  getReviewerModel(): string {
    return MODEL_TIERS.sonnet;
  }

  getImageCuratorModel(): string {
    return MODEL_TIERS.haiku;
  }

  // ──────────────────────────────────────────────
  // Token budgets per section
  // ──────────────────────────────────────────────

  getTokenBudget(sectionTitle: string, sectionIndex: number, totalSections: number): TokenBudget {
    const importance = this.classifySection(sectionTitle);

    if (importance === 'core') {
      return { maxTokens: 2000, targetChars: 1000 };
    }
    if (importance === 'simple') {
      return { maxTokens: 600, targetChars: 300 };
    }
    return { maxTokens: 1200, targetChars: 600 };
  }

  // ──────────────────────────────────────────────
  // Utility: cost estimation
  // ──────────────────────────────────────────────

  static estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[MODEL_TIERS.sonnet];
    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }
}
