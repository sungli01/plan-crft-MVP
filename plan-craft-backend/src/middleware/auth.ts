/**
 * Authentication Middleware
 */

import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { db } from '../db/index';
import { users } from '../db/schema-pg';
import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import crypto from 'crypto';

const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  WARNING: JWT_SECRET not set! Using auto-generated secret. Tokens will reset on restart.');
  return crypto.randomBytes(32).toString('hex');
})();

const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');

export { JWT_SECRET, JWT_REFRESH_SECRET };

export interface TokenPayload extends JwtPayload {
  userId: string;
  email?: string;
}

// Access Token 생성 (15분)
export function generateAccessToken(userId: string, email?: string): string {
  const payload: Record<string, string> = { userId };
  if (email) payload.email = email;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

// Refresh Token 생성 (7일)
export function generateRefreshToken(userId: string, email?: string): string {
  const payload: Record<string, string> = { userId };
  if (email) payload.email = email;
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// Access + Refresh 토큰 쌍 생성
export function generateTokenPair(userId: string, email?: string): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
  };
}

// 하위 호환: 기존 코드에서 사용하던 generateToken
export function generateToken(userId: string): string {
  return generateAccessToken(userId);
}

// Access Token 검증
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Refresh Token 검증
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// 인증 미들웨어
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '인증 토큰이 필요합니다' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ error: '유효하지 않은 토큰입니다' }, 401);
  }

  // 사용자 정보 조회
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) {
    return c.json({ error: '사용자를 찾을 수 없습니다' }, 401);
  }

  // context에 사용자 정보 추가
  c.set('user', user);
  c.set('userId', user.id);
  
  await next();
}

// 선택적 인증 (있으면 사용자 정보 추가, 없어도 계속 진행)
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (payload) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      
      if (user) {
        c.set('user', user);
      }
    }
  }
  
  await next();
}
