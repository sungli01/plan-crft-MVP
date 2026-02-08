/**
 * Database Connection - PostgreSQL Only (Production)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema-pg.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// PostgreSQL (Production)
const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });
const sqlite = null;

export { db, sqlite, client };

// 테이블 생성 (PostgreSQL)
export async function initializeDatabase() {
  try {
    // PostgreSQL - Raw SQL로 테이블 생성 (client 직접 사용)
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT,
        plan TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
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
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
    return false;
  }
}

// 헬스 체크
export async function checkDatabaseConnection() {
  try {
    await client`SELECT 1`;
    console.log('✅ PostgreSQL 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    return false;
  }
}
