import { describe, it, expect, beforeEach } from 'vitest';
import { progressTracker } from '../src/utils/progress-tracker.js';

describe('ProgressTracker', () => {
  const testProjectId = 'test-project-123';

  beforeEach(() => {
    progressTracker.clear(testProjectId);
  });

  describe('init', () => {
    it('should initialize progress for a project', () => {
      progressTracker.init(testProjectId);
      const progress = progressTracker.get(testProjectId);

      expect(progress).toBeDefined();
      expect(progress.phase).toBe('initializing');
      expect(progress.agents).toBeDefined();
      expect(progress.agents.architect.status).toBe('pending');
      expect(progress.agents.writer.status).toBe('pending');
      expect(progress.agents.imageCurator.status).toBe('pending');
      expect(progress.agents.reviewer.status).toBe('pending');
      expect(progress.logs).toEqual([]);
      expect(progress.startedAt).toBeTypeOf('number');
    });
  });

  describe('updateAgent', () => {
    it('should update an agent status', () => {
      progressTracker.init(testProjectId);
      progressTracker.updateAgent(testProjectId, 'architect', {
        status: 'running',
        progress: 50,
        detail: '설계 중...'
      });

      const progress = progressTracker.get(testProjectId);
      expect(progress.agents.architect.status).toBe('running');
      expect(progress.agents.architect.progress).toBe(50);
      expect(progress.agents.architect.detail).toBe('설계 중...');
    });

    it('should not throw for non-existent project', () => {
      expect(() => {
        progressTracker.updateAgent('nonexistent', 'architect', { status: 'done' });
      }).not.toThrow();
    });

    it('should not throw for non-existent agent', () => {
      progressTracker.init(testProjectId);
      expect(() => {
        progressTracker.updateAgent(testProjectId, 'nonexistent', { status: 'done' });
      }).not.toThrow();
    });
  });

  describe('addLog', () => {
    it('should add log entries', () => {
      progressTracker.init(testProjectId);
      progressTracker.addLog(testProjectId, { message: 'Starting generation' });
      progressTracker.addLog(testProjectId, { message: 'Architect phase done' });

      const progress = progressTracker.get(testProjectId);
      expect(progress.logs).toHaveLength(2);
      expect(progress.logs[0].message).toBe('Starting generation');
      expect(progress.logs[0].timestamp).toBeTypeOf('number');
      expect(progress.logs[0].time).toBeTypeOf('string');
    });

    it('should keep only the last 100 logs', () => {
      progressTracker.init(testProjectId);
      for (let i = 0; i < 110; i++) {
        progressTracker.addLog(testProjectId, { message: `Log ${i}` });
      }

      const progress = progressTracker.get(testProjectId);
      expect(progress.logs).toHaveLength(100);
      expect(progress.logs[0].message).toBe('Log 10');
    });
  });

  describe('updatePhase', () => {
    it('should update the current phase', () => {
      progressTracker.init(testProjectId);
      progressTracker.updatePhase(testProjectId, 'writing');

      const progress = progressTracker.get(testProjectId);
      expect(progress.phase).toBe('writing');
    });
  });

  describe('calculateOverallProgress', () => {
    it('should return 0 for non-existent project', () => {
      expect(progressTracker.calculateOverallProgress('nonexistent')).toBe(0);
    });

    it('should calculate average progress across agents', () => {
      progressTracker.init(testProjectId);
      progressTracker.updateAgent(testProjectId, 'architect', { progress: 100 });
      progressTracker.updateAgent(testProjectId, 'writer', { progress: 50 });
      progressTracker.updateAgent(testProjectId, 'imageCurator', { progress: 0 });
      progressTracker.updateAgent(testProjectId, 'reviewer', { progress: 0 });

      const overall = progressTracker.calculateOverallProgress(testProjectId);
      expect(overall).toBe(38); // (100 + 50 + 0 + 0) / 4 = 37.5, rounded to 38
    });
  });

  describe('clear', () => {
    it('should remove progress data for a project', () => {
      progressTracker.init(testProjectId);
      expect(progressTracker.get(testProjectId)).toBeDefined();

      progressTracker.clear(testProjectId);
      expect(progressTracker.get(testProjectId)).toBeUndefined();
    });
  });
});
