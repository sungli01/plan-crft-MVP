/**
 * Database Connection - PostgreSQL Only (Production)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema-pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// PostgreSQL (Production)
const isPublicUrl = DATABASE_URL.includes('proxy.rlwy.net') || DATABASE_URL.includes('railway.app');
const client = postgres(DATABASE_URL, {
  ssl: isPublicUrl ? { rejectUnauthorized: false } : false,
});
const db = drizzle(client, { schema });
const sqlite = null;

export { db, sqlite, client };

// 테이블 생성 (PostgreSQL)
export async function initializeDatabase(): Promise<boolean> {
  try {
    // PostgreSQL - Raw SQL로 테이블 생성 (client 직접 사용)
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT,
        plan TEXT DEFAULT 'free',
        oauth_provider TEXT,
        oauth_id TEXT,
        tier TEXT DEFAULT 'free',
        login_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add new columns to existing tables (safe to run multiple times)
    await client`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$
    `;

    // Auto-approve ALL users + reset monthly usage
    await client`UPDATE users SET approved = true WHERE approved IS NULL OR approved = false`;
    await client`DELETE FROM token_usage WHERE created_at < NOW() - INTERVAL '1 day'`;

    // Auto-set admin user (sungli01@naver.com)
    await client`
      UPDATE users
      SET role = 'admin', approved = true
      WHERE email = 'sungli01@naver.com' AND (role != 'admin' OR approved != true)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        idea TEXT NOT NULL,
        reference_doc TEXT,
        status TEXT DEFAULT 'draft',
        model TEXT DEFAULT 'claude-opus-4',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add new columns to existing projects table (safe migration)
    await client`
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS reference_doc TEXT;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS error_message TEXT;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'claude-opus-4';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$
    `;

    await client`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        content_html TEXT,
        content_pdf_url TEXT,
        quality_score REAL,
        section_count INTEGER,
        word_count INTEGER,
        image_count INTEGER,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        generated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS mockups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        user_id UUID NOT NULL REFERENCES users(id),
        html TEXT NOT NULL,
        style TEXT DEFAULT 'modern',
        metadata TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS token_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        project_id UUID REFERENCES projects(id),
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        cost_usd REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ PostgreSQL 데이터베이스 초기화 완료');
    return true;
  } catch (error: any) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
    return false;
  }
}

// 헬스 체크
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const host = dbUrl.match(/@([^:\/]+)/)?.[1] || 'unknown';
    console.log(`🔍 DB 연결 시도: host=${host}`);
    await client`SELECT 1`;
    console.log('✅ PostgreSQL 연결 성공');
    return true;
  } catch (error: any) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    return false;
  }
}
