/**
 * Authentication Routes
 */

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { db } from '../db/index';
import { users } from '../db/schema-pg';
import { eq } from 'drizzle-orm';
import { generateTokenPair, verifyRefreshToken, authMiddleware, JWT_SECRET, JWT_REFRESH_SECRET } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const auth = new Hono();

// Login attempt tracking (in-memory)
const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getLoginAttemptInfo(email: string) {
  return loginAttempts.get(email) || { count: 0, lockedUntil: null };
}

function recordFailedAttempt(email: string): { locked: boolean; remaining: number } {
  const info = getLoginAttemptInfo(email);
  info.count += 1;

  if (info.count >= MAX_LOGIN_ATTEMPTS) {
    info.lockedUntil = Date.now() + LOCK_DURATION_MS;
    loginAttempts.set(email, info);
    return { locked: true, remaining: 0 };
  }

  loginAttempts.set(email, info);
  return { locked: false, remaining: MAX_LOGIN_ATTEMPTS - info.count };
}

function clearLoginAttempts(email: string) {
  loginAttempts.delete(email);
}

function isAccountLocked(email: string): boolean {
  const info = getLoginAttemptInfo(email);
  if (!info.lockedUntil) return false;

  if (Date.now() > info.lockedUntil) {
    // Lock expired, clear
    loginAttempts.delete(email);
    return false;
  }
  return true;
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').optional()
});

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요')
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '현재 비밀번호를 입력하세요'),
  newPassword: z.string().min(8, '새 비밀번호는 최소 8자 이상이어야 합니다')
});

// 회원가입
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const validated = registerSchema.parse(body);

    // 이메일 중복 확인
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (existingUser) {
      return c.json({ error: '이미 사용 중인 이메일입니다' }, 400);
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Admin 이메일은 자동 승인 + admin 역할
    const isAdminEmail = validated.email === 'sungli01@naver.com';

    // 사용자 생성
    const [newUser] = await db
      .insert(users)
      .values({
        email: validated.email,
        passwordHash,
        name: validated.name || null,
        plan: 'free',
        role: isAdminEmail ? 'admin' : 'user',
        approved: isAdminEmail ? true : false,
      })
      .returning();

    // 미승인 사용자는 토큰 발급하지 않음
    if (!newUser.approved) {
      return c.json({
        message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          plan: newUser.plan,
          approved: newUser.approved,
        },
        pendingApproval: true,
      }, 201);
    }

    // JWT 토큰 쌍 생성 (승인된 사용자만)
    const tokens = generateTokenPair(newUser.id, newUser.email);

    return c.json({
      message: '회원가입이 완료되었습니다',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
        role: newUser.role,
        approved: newUser.approved,
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }, 201);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: '입력 값이 유효하지 않습니다', 
        details: error.errors 
      }, 400);
    }

    console.error('회원가입 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 로그인
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validated = loginSchema.parse(body);

    // 계정 잠금 확인
    if (isAccountLocked(validated.email)) {
      return c.json({ error: '로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요.' }, 429);
    }

    // 사용자 조회
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (!user) {
      recordFailedAttempt(validated.email);
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(validated.password, user.passwordHash);

    if (!isValid) {
      const result = recordFailedAttempt(validated.email);
      if (result.locked) {
        return c.json({ error: '로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요.' }, 429);
      }
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }

    // 로그인 성공 — 시도 횟수 초기화
    clearLoginAttempts(validated.email);

    // 승인 여부 확인
    if (!user.approved) {
      return c.json({
        error: '관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.',
        code: 'PENDING_APPROVAL',
        pendingApproval: true,
      }, 403);
    }

    // JWT 토큰 쌍 생성
    const tokens = generateTokenPair(user.id, user.email);

    return c.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
        approved: user.approved,
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: '입력 값이 유효하지 않습니다', 
        details: error.errors 
      }, 400);
    }

    console.error('로그인 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 토큰 갱신
auth.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      return c.json({ error: '리프레시 토큰이 필요합니다' }, 400);
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return c.json({ error: '유효하지 않은 리프레시 토큰입니다' }, 401);
    }

    // Issue new token pair
    const newAccessToken = jwt.sign(
      { userId: payload.userId, email: payload.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const newRefreshToken = jwt.sign(
      { userId: payload.userId, email: payload.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (e) {
    return c.json({ error: '유효하지 않은 리프레시 토큰입니다' }, 401);
  }
});

// 비밀번호 변경 (인증 필요)
auth.post('/change-password', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validated = changePasswordSchema.parse(body);

    const user = c.get('user') as any;

    // 현재 비밀번호 확인
    const isValid = await bcrypt.compare(validated.oldPassword, user.passwordHash);

    if (!isValid) {
      return c.json({ error: '현재 비밀번호가 올바르지 않습니다' }, 400);
    }

    // 새 비밀번호 해싱 및 업데이트
    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);

    await db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return c.json({ message: '비밀번호가 변경되었습니다' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: '입력 값이 유효하지 않습니다',
        details: error.errors
      }, 400);
    }

    console.error('비밀번호 변경 오류:', error);
    return c.json({ error: '서버 오류가 발생했습니다' }, 500);
  }
});

// 프로필 업데이트 (인증 필요)
auth.patch('/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;
    const body = await c.req.json();
    const { name } = body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name && typeof name === 'string' && name.trim().length >= 1) {
      updateData.name = name.trim();
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning();

    return c.json({
      message: '프로필이 업데이트되었습니다',
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        role: updated.role,
        approved: updated.approved,
        createdAt: updated.createdAt,
      },
    });
  } catch (error: any) {
    console.error('프로필 업데이트 오류:', error);
    return c.json({ error: '프로필 업데이트에 실패했습니다' }, 500);
  }
});

// 현재 사용자 정보 조회 (인증 필요)
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user') as any;

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      role: user.role,
      approved: user.approved,
      createdAt: user.createdAt
    }
  });
});

export default auth;
