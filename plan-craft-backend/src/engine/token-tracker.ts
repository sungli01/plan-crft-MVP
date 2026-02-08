/**
 * Token Usage Tracker
 *
 * Tracks per-agent token consumption and cost across a full document generation run.
 */

import { MODEL_PRICING, MODEL_TIERS } from './model-router';

export interface AgentUsageEntry {
  input: number;
  output: number;
  model: string;
  cost: number;
}

export interface WriterUsageEntry {
  sectionTitle: string;
  input: number;
  output: number;
  model: string;
  cost: number;
}

export interface UsageData {
  architect: AgentUsageEntry;
  writers: WriterUsageEntry[];
  imageCurator: AgentUsageEntry;
  reviewer: AgentUsageEntry;
  total: { input: number; output: number; cost: number };
}

export interface RecordUsageData {
  input_tokens?: number;
  output_tokens?: number;
  model?: string;
  sectionTitle?: string;
}

export type AgentName = 'architect' | 'writer' | 'imageCurator' | 'reviewer';

export interface AgentSummary {
  model: string;
  input: number;
  output: number;
  total: number;
  cost: string;
}

export interface TokenSummary {
  elapsed: string;
  agents: {
    architect: AgentSummary;
    writer: {
      sections: number;
      models: string[];
      input: number;
      output: number;
      total: number;
      cost: string;
    };
    imageCurator: AgentSummary;
    reviewer: AgentSummary;
  };
  total: {
    input: number;
    output: number;
    tokens: number;
    cost: string;
  };
}

export interface OptimizationSuggestion {
  type: string;
  message: string;
  sections?: string[];
}

export interface OptimizationReport {
  summary: TokenSummary;
  suggestions: OptimizationSuggestion[];
  modelBreakdown: {
    opus: number;
    sonnet: number;
    haiku: number;
  };
}

export class TokenTracker {
  usage: UsageData;
  private _startTime: number;

  constructor() {
    this.usage = {
      architect: { input: 0, output: 0, model: '', cost: 0 },
      writers: [],
      imageCurator: { input: 0, output: 0, model: '', cost: 0 },
      reviewer: { input: 0, output: 0, model: '', cost: 0 },
      total: { input: 0, output: 0, cost: 0 },
    };
    this._startTime = Date.now();
  }

  // ──────────────────────────────────────────────
  // Record usage
  // ──────────────────────────────────────────────

  recordUsage(agent: AgentName, data: RecordUsageData): void {
    const inputTokens = data.input_tokens || 0;
    const outputTokens = data.output_tokens || 0;
    const model = data.model || MODEL_TIERS.sonnet;
    const cost = this._calculateCost(model, inputTokens, outputTokens);

    if (agent === 'writer') {
      this.usage.writers.push({
        sectionTitle: data.sectionTitle || `Section ${this.usage.writers.length + 1}`,
        input: inputTokens,
        output: outputTokens,
        model,
        cost,
      });
    } else if (this.usage[agent]) {
      this.usage[agent].input += inputTokens;
      this.usage[agent].output += outputTokens;
      this.usage[agent].model = model;
      this.usage[agent].cost += cost;
    }

    // Update totals
    this.usage.total.input += inputTokens;
    this.usage.total.output += outputTokens;
    this.usage.total.cost += cost;
  }

  // ──────────────────────────────────────────────
  // Summaries
  // ──────────────────────────────────────────────

  getSummary(): TokenSummary {
    const elapsed = ((Date.now() - this._startTime) / 1000).toFixed(1);

    const writerTotal = this.usage.writers.reduce(
      (acc, w) => ({
        input: acc.input + w.input,
        output: acc.output + w.output,
        cost: acc.cost + w.cost,
      }),
      { input: 0, output: 0, cost: 0 },
    );

    const writerModels = [...new Set(this.usage.writers.map(w => w.model))];

    return {
      elapsed: `${elapsed}s`,
      agents: {
        architect: {
          ...this._formatAgent(this.usage.architect),
        },
        writer: {
          sections: this.usage.writers.length,
          models: writerModels,
          input: writerTotal.input,
          output: writerTotal.output,
          total: writerTotal.input + writerTotal.output,
          cost: `$${writerTotal.cost.toFixed(4)}`,
        },
        imageCurator: {
          ...this._formatAgent(this.usage.imageCurator),
        },
        reviewer: {
          ...this._formatAgent(this.usage.reviewer),
        },
      },
      total: {
        input: this.usage.total.input,
        output: this.usage.total.output,
        tokens: this.usage.total.input + this.usage.total.output,
        cost: `$${this.usage.total.cost.toFixed(4)}`,
      },
    };
  }

  getOptimizationReport(): OptimizationReport {
    const summary = this.getSummary();
    const suggestions: OptimizationSuggestion[] = [];

    const overBudgetWriters = this.usage.writers.filter(w => w.output > 2500);
    if (overBudgetWriters.length > 0) {
      suggestions.push({
        type: 'over_budget',
        message: `${overBudgetWriters.length} writer section(s) exceeded 2500 output tokens. Consider tighter max_tokens.`,
        sections: overBudgetWriters.map(w => w.sectionTitle),
      });
    }

    const opusWriters = this.usage.writers.filter(w => w.model === MODEL_TIERS.opus);
    const sonnetWriters = this.usage.writers.filter(w => w.model === MODEL_TIERS.sonnet);
    if (opusWriters.length > 0) {
      const opusCost = opusWriters.reduce((s, w) => s + w.cost, 0);
      suggestions.push({
        type: 'model_mix',
        message: `${opusWriters.length} section(s) used Opus ($${opusCost.toFixed(4)}), ${sonnetWriters.length} used Sonnet. Pro mode routing active.`,
      });
    }

    if (this.usage.imageCurator.model && this.usage.imageCurator.model !== MODEL_TIERS.haiku) {
      suggestions.push({
        type: 'downgrade_possible',
        message: `ImageCurator is using ${this.usage.imageCurator.model}. Haiku is sufficient for keyword extraction.`,
      });
    }

    const totalCost = this.usage.total.cost;
    const target = 0.20;
    if (totalCost > target) {
      suggestions.push({
        type: 'cost_warning',
        message: `Total cost $${totalCost.toFixed(4)} exceeds target $${target.toFixed(2)}. Review model routing and token budgets.`,
      });
    } else {
      suggestions.push({
        type: 'cost_ok',
        message: `Total cost $${totalCost.toFixed(4)} is within target $${target.toFixed(2)}. ✅`,
      });
    }

    return {
      summary,
      suggestions,
      modelBreakdown: {
        opus: opusWriters.length,
        sonnet: sonnetWriters.length + (this.usage.architect.model === MODEL_TIERS.sonnet ? 1 : 0) +
                (this.usage.reviewer.model === MODEL_TIERS.sonnet ? 1 : 0),
        haiku: this.usage.imageCurator.model === MODEL_TIERS.haiku ? 1 : 0,
      },
    };
  }

  // ──────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────

  private _calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[MODEL_TIERS.sonnet];
    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }

  private _formatAgent(agentData: AgentUsageEntry): AgentSummary {
    return {
      model: agentData.model || '—',
      input: agentData.input,
      output: agentData.output,
      total: agentData.input + agentData.output,
      cost: `$${agentData.cost.toFixed(4)}`,
    };
  }
}
