/**
 * Smart Model Router — routes tasks to optimal models based on complexity/importance
 *
 * Strategy:
 * - Core content sections (시장분석, 사업전략 등): Opus 4.6 (highest quality) in Pro mode
 * - Standard sections (추진체계, 일정 등): Sonnet 4.5 (good quality, lower cost)
 * - Simple sections (부록, 참고자료 등): Sonnet 4.5 (sufficient)
 * - Image keyword extraction: Haiku 3.5 (lightweight task)
 * - Architect (structure): Sonnet 4.5 (structured output, doesn't need Opus)
 * - Reviewer (scoring): Sonnet 4.5 (evaluation task)
 *
 * Cost reduction: ~$0.52 → ~$0.20/document by routing only critical sections to Opus
 */

export const MODEL_TIERS = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-3-5-haiku-20241022',
};

// Per-token pricing (USD)
export const MODEL_PRICING = {
  [MODEL_TIERS.opus]:   { input: 0.000005, output: 0.000025 },
  [MODEL_TIERS.sonnet]: { input: 0.000003, output: 0.000015 },
  [MODEL_TIERS.haiku]:  { input: 0.0000008, output: 0.000004 },
};

// Section importance classification
export const SECTION_IMPORTANCE = {
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

export class ModelRouter {
  /**
   * @param {object} config
   * @param {boolean} config.proMode - When true, core sections use Opus
   */
  constructor(config = {}) {
    this.proMode = config.proMode || false;
    this.defaultModel = this.proMode ? MODEL_TIERS.opus : MODEL_TIERS.sonnet;
  }

  // ──────────────────────────────────────────────
  // Section importance classification
  // ──────────────────────────────────────────────

  /**
   * Classify a section title into core / standard / simple
   */
  classifySection(sectionTitle) {
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

  /**
   * Determine model for a Writer section
   */
  getWriterModel(sectionTitle, sectionIndex, totalSections) {
    const importance = this.classifySection(sectionTitle);

    // Core sections → Opus (Pro) or Sonnet (Free)
    if (importance === 'core') {
      return this.proMode ? MODEL_TIERS.opus : MODEL_TIERS.sonnet;
    }

    // Simple sections → always Sonnet (even in Pro mode)
    if (importance === 'simple') {
      return MODEL_TIERS.sonnet;
    }

    // Positional importance: first 3 and last 2 sections (exec summary, conclusion)
    if (sectionIndex < 3 || sectionIndex >= totalSections - 2) {
      return this.proMode ? MODEL_TIERS.opus : MODEL_TIERS.sonnet;
    }

    // Standard sections → Sonnet
    return MODEL_TIERS.sonnet;
  }

  getArchitectModel() {
    // Structure design works well with Sonnet
    return MODEL_TIERS.sonnet;
  }

  getReviewerModel() {
    // Evaluation task — Sonnet is sufficient
    return MODEL_TIERS.sonnet;
  }

  getImageCuratorModel() {
    // Keyword extraction is lightweight → Haiku
    return MODEL_TIERS.haiku;
  }

  // ──────────────────────────────────────────────
  // Token budgets per section
  // ──────────────────────────────────────────────

  /**
   * Get max_tokens and target character count for a section
   */
  getTokenBudget(sectionTitle, sectionIndex, totalSections) {
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

  static estimateCost(model, inputTokens, outputTokens) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[MODEL_TIERS.sonnet];
    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }
}
