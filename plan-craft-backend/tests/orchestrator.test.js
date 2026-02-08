import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../src/engine/orchestrator.js';

describe('Orchestrator', () => {
  const dummyConfig = {
    apiKey: 'test-key',
    architectModel: 'claude-opus-4-6',
    writerModel: 'claude-opus-4-6',
    curatorModel: 'claude-opus-4-6',
    reviewerModel: 'claude-opus-4-6',
  };

  describe('constructor', () => {
    it('should initialize with agents and clean token tracking', () => {
      const orch = new Orchestrator(dummyConfig);
      expect(orch.architect).toBeDefined();
      expect(orch.writer).toBeDefined();
      expect(orch.imageCurator).toBeDefined();
      expect(orch.reviewer).toBeDefined();
      expect(orch.tokenUsage.architect).toEqual({ input: 0, output: 0 });
      expect(orch.tokenUsage.writer).toEqual({ input: 0, output: 0 });
      expect(orch.progress.phase).toBe('idle');
    });
  });

  describe('updateTokenUsage', () => {
    it('should accumulate token usage for an agent', () => {
      const orch = new Orchestrator(dummyConfig);
      orch.updateTokenUsage('architect', { input_tokens: 100, output_tokens: 200 });
      orch.updateTokenUsage('architect', { input_tokens: 50, output_tokens: 30 });

      expect(orch.tokenUsage.architect.input).toBe(150);
      expect(orch.tokenUsage.architect.output).toBe(230);
    });

    it('should ignore unknown agents gracefully', () => {
      const orch = new Orchestrator(dummyConfig);
      expect(() => orch.updateTokenUsage('unknown', { input_tokens: 10 })).not.toThrow();
    });

    it('should handle null/undefined tokens', () => {
      const orch = new Orchestrator(dummyConfig);
      expect(() => orch.updateTokenUsage('writer', null)).not.toThrow();
      expect(() => orch.updateTokenUsage('writer', undefined)).not.toThrow();
    });
  });

  describe('getTotalTokenUsage', () => {
    it('should sum tokens across all agents', () => {
      const orch = new Orchestrator(dummyConfig);
      orch.updateTokenUsage('architect', { input_tokens: 100, output_tokens: 50 });
      orch.updateTokenUsage('writer', { input_tokens: 200, output_tokens: 100 });
      orch.updateTokenUsage('imageCurator', { input_tokens: 30, output_tokens: 20 });
      orch.updateTokenUsage('reviewer', { input_tokens: 80, output_tokens: 40 });

      const total = orch.getTotalTokenUsage();
      expect(total.input).toBe(410);
      expect(total.output).toBe(210);
      expect(total.total).toBe(620);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for known models', () => {
      const orch = new Orchestrator(dummyConfig);
      const cost = orch.calculateCost('claude-opus-4-6', { input: 1000, output: 500 });
      // claude-opus-4-6: input $0.000005/token, output $0.000025/token
      expect(cost).toBeCloseTo(0.005 + 0.0125, 4);
    });

    it('should fall back to default cost for unknown models', () => {
      const orch = new Orchestrator(dummyConfig);
      const cost = orch.calculateCost('unknown-model', { input: 1000, output: 500 });
      // falls back to claude-opus-4-6 pricing
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('updateProgress', () => {
    it('should update progress state', () => {
      const orch = new Orchestrator(dummyConfig);
      orch.updateProgress('작성', 2, 4);

      expect(orch.progress.phase).toBe('작성');
      expect(orch.progress.currentStep).toBe(2);
      expect(orch.progress.totalSteps).toBe(4);
      expect(orch.progress.percentage).toBe('50.0');
    });

    it('should handle zero total steps', () => {
      const orch = new Orchestrator(dummyConfig);
      orch.updateProgress('idle', 0, 0);
      expect(orch.progress.percentage).toBe(0);
    });
  });
});
