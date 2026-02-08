/**
 * Database Schema - PostgreSQL
 */

import { pgTable, text, integer, real, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

// Users 테이블
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  plan: text('plan').default('free'),
  oauthProvider: text('oauth_provider'),   // 'google' | 'github' | null
  oauthId: text('oauth_id'),
  tier: text('tier').default('free'),       // 'free' | 'pro'
  role: text('role').default('user'),        // 'user' | 'admin'
  approved: boolean('approved').default(false),
  loginAttempts: integer('login_attempts').default(0),
  lockedUntil: text('locked_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Projects 테이블
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  idea: text('idea').notNull(),
  referenceDoc: text('reference_doc'),
  status: text('status').default('draft'),
  model: text('model').default('claude-opus-4'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Documents 테이블
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  contentHtml: text('content_html'),
  contentPdfUrl: text('content_pdf_url'),
  qualityScore: real('quality_score'),
  sectionCount: integer('section_count'),
  wordCount: integer('word_count'),
  imageCount: integer('image_count'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  generatedAt: timestamp('generated_at').defaultNow()
});

// Mockups 테이블
export const mockups = pgTable('mockups', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  html: text('html').notNull(),
  style: text('style').default('modern'),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
});

// Token Usage 테이블
export const tokenUsage = pgTable('token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').references(() => projects.id),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
