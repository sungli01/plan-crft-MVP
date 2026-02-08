/**
 * Authentication Routes
 */

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema-pg.js';
import { eq } from 'drizzle-orm';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const auth = new Hono();

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

    // 사용자 생성
    const [newUser] = await db
      .insert(users)
      .values({
        email: validated.email,
        passwordHash,
        name: validated.name || null,
        plan: 'free'
      })
      .returning();

    // JWT 토큰 생성
    const token = generateToken(newUser.id);

    return c.json({
      message: '회원가입이 완료되었습니다',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan
      },
      token
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

    // 사용자 조회
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);

    if (!user) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(validated.password, user.passwordHash);

    if (!isValid) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }

    // JWT 토큰 생성
    const token = generateToken(user.id);

    return c.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      },
      token
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

// 현재 사용자 정보 조회 (인증 필요)
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt
    }
  });
});

export default auth;
