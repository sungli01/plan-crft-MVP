/**
 * Database Connection - PostgreSQL/SQLite
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

let db, sqlite;

if (DATABASE_URL && !DATABASE_URL.includes('.db')) {
  // PostgreSQL (Production)
  const client = postgres(DATABASE_URL);
  db = drizzle(client, { schema });
  sqlite = null;
} else {
  // SQLite (Development)
  const sqliteDb = new Database(DATABASE_URL || './dev.db');
  db = drizzleSqlite(sqliteDb, { schema });
  sqlite = sqliteDb;
}

export { db, sqlite };

// 테이블 생성
export async function initializeDatabase() {
  try {
    if (sqlite) {
      // SQLite
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT,
          plan TEXT DEFAULT 'free',
          created_at INTEGER,
          updated_at INTEGER
        )
      `);

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          idea TEXT NOT NULL,
          status TEXT DEFAULT 'draft',
          model TEXT DEFAULT 'claude-opus-4',
          created_at INTEGER,
          updated_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          content_html TEXT,
          content_pdf_url TEXT,
          quality_score REAL,
          section_count INTEGER,
          word_count INTEGER,
          image_count INTEGER,
          metadata TEXT,
          created_at INTEGER,
          generated_at INTEGER,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `);

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS token_usage (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          project_id TEXT,
          model TEXT NOT NULL,
          input_tokens INTEGER NOT NULL,
          output_tokens INTEGER NOT NULL,
          total_tokens INTEGER NOT NULL,
          cost_usd REAL NOT NULL,
          created_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `);

      console.log('✅ SQLite 데이터베이스 초기화 완료');
    } else {
      // PostgreSQL - 스키마는 Drizzle migrate로 처리
      console.log('✅ PostgreSQL 연결 - 마이그레이션 필요');
    }
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
    return false;
  }
}

// 헬스 체크
export async function checkDatabaseConnection() {
  try {
    if (sqlite) {
      const result = sqlite.prepare('SELECT 1').get();
      console.log('✅ SQLite 연결 성공');
    } else {
      await db.execute('SELECT 1');
      console.log('✅ PostgreSQL 연결 성공');
    }
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    return false;
  }
}
