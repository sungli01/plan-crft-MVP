/**
 * Plan-Craft Backend API Server
 */

import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { checkDatabaseConnection, initializeDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import generateRoutes from './routes/generate.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: (origin) => {
    const allowed = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
    return allowed.includes(origin) ? origin : allowed[0];
  },
  credentials: true
}));

// Simple rate limiter
const rateLimitMap = new Map();
function rateLimit(keyFn, maxRequests, windowMs) {
  return async (c, next) => {
    const key = keyFn(c);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
    const requests = rateLimitMap.get(key).filter(t => t > windowStart);
    rateLimitMap.set(key, requests);
    
    if (requests.length >= maxRequests) {
      return c.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, 429);
    }
    
    requests.push(now);
    await next();
  };
}

// Apply rate limits
app.use('/api/generate/*', rateLimit(
  (c) => c.req.header('Authorization') || c.req.header('x-forwarded-for') || 'anonymous',
  5, 60 * 60 * 1000  // 5 requests per hour for generation
));
app.use('/api/auth/*', rateLimit(
  (c) => c.req.header('x-forwarded-for') || 'anonymous',
  20, 15 * 60 * 1000  // 20 requests per 15 min for auth
));

// Health check
app.get('/', (c) => {
  return c.json({ 
    message: 'Plan-Craft API Server',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', async (c) => {
  const dbConnected = await checkDatabaseConnection();
  
  return c.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/generate', generateRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '8000');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       Plan-Craft Backend API Server Starting...         ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log('📦 Initializing PostgreSQL database...');
initializeDatabase();

console.log(`\n🚀 Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`\n✅ Server is running on http://localhost:${info.port}`);
  console.log(`\n📚 Available routes:`);
  console.log(`   GET  /                              - API 정보`);
  console.log(`   GET  /health                        - Health check`);
  console.log(`   POST /api/auth/register             - 회원가입`);
  console.log(`   POST /api/auth/login                - 로그인`);
  console.log(`   GET  /api/auth/me                   - 현재 사용자`);
  console.log(`   GET  /api/projects                  - 프로젝트 목록`);
  console.log(`   POST /api/projects                  - 프로젝트 생성`);
  console.log(`   GET  /api/projects/:id              - 프로젝트 상세`);
  console.log(`   PATCH /api/projects/:id             - 프로젝트 수정`);
  console.log(`   DELETE /api/projects/:id            - 프로젝트 삭제`);
  console.log(`   POST /api/generate/:projectId           - 문서 생성`);
  console.log(`   GET  /api/generate/:projectId/status    - 생성 상태 확인`);
  console.log(`   GET  /api/generate/:projectId/download  - HTML 다운로드`);
  console.log('');
});
