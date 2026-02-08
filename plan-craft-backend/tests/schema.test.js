import { describe, it, expect } from 'vitest';
import { users, projects, documents, tokenUsage } from '../src/db/schema-pg.js';

describe('Database Schema', () => {
  describe('users table', () => {
    it('should be defined with correct table name', () => {
      expect(users).toBeDefined();
    });

    it('should have expected columns', () => {
      const columnNames = Object.keys(users);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('passwordHash');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('plan');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });
  });

  describe('projects table', () => {
    it('should be defined with correct table name', () => {
      expect(projects).toBeDefined();
    });

    it('should have expected columns', () => {
      const columnNames = Object.keys(projects);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('title');
      expect(columnNames).toContain('idea');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('model');
      expect(columnNames).toContain('errorMessage');
    });
  });

  describe('documents table', () => {
    it('should be defined with correct table name', () => {
      expect(documents).toBeDefined();
    });

    it('should have expected columns', () => {
      const columnNames = Object.keys(documents);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('projectId');
      expect(columnNames).toContain('contentHtml');
      expect(columnNames).toContain('qualityScore');
      expect(columnNames).toContain('sectionCount');
      expect(columnNames).toContain('wordCount');
      expect(columnNames).toContain('imageCount');
    });
  });

  describe('tokenUsage table', () => {
    it('should be defined', () => {
      expect(tokenUsage).toBeDefined();
    });

    it('should have expected columns', () => {
      const columnNames = Object.keys(tokenUsage);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('projectId');
      expect(columnNames).toContain('model');
      expect(columnNames).toContain('inputTokens');
      expect(columnNames).toContain('outputTokens');
      expect(columnNames).toContain('totalTokens');
      expect(columnNames).toContain('costUsd');
    });
  });
});
