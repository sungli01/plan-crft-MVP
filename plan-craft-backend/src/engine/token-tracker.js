/**
 * Token Usage Tracker
 *
 * Tracks per-agent token consumption and cost across a full document generation run.
 * Provides summaries and optimization reports.
 */

import { MODEL_PRICING, MODEL_TIERS } from './model-router.js';

export class TokenTracker {
  constructor() {
    this.usage = {
      architect: { input: 0, output: 0, model: '', cost: 0 },
      writers: [],          // per-section entries
      imageCurator: { input: 0, output: 0, model: '', cost: 0 },
      reviewer: { input: 0, output: 0, model: '', cost: 0 },
      total: { input: 0, output: 0, cost: 0 },
    };
    this._startTime = Date.now();
  }

  // ──────────────────────────────────────────────
  // Record usage
  // ──────────────────────────────────────────────

  /**
   * Record token usage for an agent call
   * @param {'architect'|'writer'|'imageCurator'|'reviewer'} agent
   * @param {object} data
   * @param {number} data.input_tokens
   * @param {number} data.output_tokens
   * @param {string} data.model
   * @param {string} [data.sectionTitle] - For writer entries
   */
  recordUsage(agent, data) {
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

  /**
   * Return a formatted summary of all token usage and costs
   */
  getSummary() {
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

  /**
   * Compare actual usage vs budget and suggest improvements
   */
  getOptimizationReport() {
    const summary = this.getSummary();
    const suggestions = [];

    // Check if any writer sections used too many tokens
    const overBudgetWriters = this.usage.writers.filter(w => w.output > 2500);
    if (overBudgetWriters.length > 0) {
      suggestions.push({
        type: 'over_budget',
        message: `${overBudgetWriters.length} writer section(s) exceeded 2500 output tokens. Consider tighter max_tokens.`,
        sections: overBudgetWriters.map(w => w.sectionTitle),
      });
    }

    // Check if Opus was used where Sonnet would suffice
    const opusWriters = this.usage.writers.filter(w => w.model === MODEL_TIERS.opus);
    const sonnetWriters = this.usage.writers.filter(w => w.model === MODEL_TIERS.sonnet);
    if (opusWriters.length > 0) {
      const opusCost = opusWriters.reduce((s, w) => s + w.cost, 0);
      suggestions.push({
        type: 'model_mix',
        message: `${opusWriters.length} section(s) used Opus ($${opusCost.toFixed(4)}), ${sonnetWriters.length} used Sonnet. Pro mode routing active.`,
      });
    }

    // Check if imageCurator could use a cheaper model
    if (this.usage.imageCurator.model && this.usage.imageCurator.model !== MODEL_TIERS.haiku) {
      suggestions.push({
        type: 'downgrade_possible',
        message: `ImageCurator is using ${this.usage.imageCurator.model}. Haiku is sufficient for keyword extraction.`,
      });
    }

    // Overall cost assessment
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

  _calculateCost(model, inputTokens, outputTokens) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING[MODEL_TIERS.sonnet];
    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  }

  _formatAgent(agentData) {
    return {
      model: agentData.model || '—',
      input: agentData.input,
      output: agentData.output,
      total: agentData.input + agentData.output,
      cost: `$${agentData.cost.toFixed(4)}`,
    };
  }
}
