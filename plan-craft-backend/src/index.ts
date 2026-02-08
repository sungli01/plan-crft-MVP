/**
 * Plan-Craft Backend API Server
 */

import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { createNodeWebSocket } from '@hono/node-ws';
import type { Context, Next } from 'hono';
import { checkDatabaseConnection, initializeDatabase } from './db/index';
import authRoutes from './routes/auth';
import oauthRouter from './routes/oauth';
import projectsRoutes from './routes/projects';
import generateRoutes from './routes/generate';
import usageRoutes from './routes/usage';
import mockupRouter from './routes/mockup';
import sharingRouter from './routes/sharing';
import versionsRouter from './routes/versions';
import commentsRouter from './routes/comments';
import { addConnection, removeConnection, getConnectionCount } from './ws/progress-ws';
import { progressTracker } from './utils/progress-tracker';
import { getCache } from './cache/redis';

const app = new Hono();

// WebSocket setup
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket route for real-time progress updates
app.get('/ws/progress/:projectId', upgradeWebSocket((c) => {
  const projectId = c.req.param('projectId');

  return {
    onOpen(_evt, ws) {
      addConnection(projectId, ws.raw);
      // Send current progress state immediately on connect
      const currentProgress = progressTracker.get(projectId);
      if (currentProgress) {
        ws.send(JSON.stringify({
          type: 'initial_state',
          phase: currentProgress.phase,
          agents: currentProgress.agents,
          logs: currentProgress.logs.slice(-20),
          overallProgress: progressTracker.calculateOverallProgress(projectId),
          startedAt: currentProgress.startedAt,
          updatedAt: currentProgress.updatedAt
        }));
      }
    },
    onClose(_evt, ws) {
      removeConnection(projectId, ws.raw);
    },
    onError(_evt, ws) {
      removeConnection(projectId, ws.raw);
    },
  };
}));

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
const rateLimitMap = new Map<string, number[]>();

function rateLimit(keyFn: (c: Context) => string, maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const key = keyFn(c);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
    const requests = rateLimitMap.get(key)!.filter(t => t > windowStart);
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
  let cacheType = 'initializing';
  try {
    const cache = await getCache();
    cacheType = cache.type;
  } catch { /* ignore */ }

  return c.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    wsConnections: getConnectionCount(),
    cacheType,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/oauth', oauthRouter);
app.route('/api/projects', projectsRoutes);
app.route('/api/generate', generateRoutes);
app.route('/api/usage', usageRoutes);
app.route('/api/mockup', mockupRouter);
app.route('/api/share', sharingRouter);
app.route('/api/versions', versionsRouter);
app.route('/api/comments', commentsRouter);

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

const server = serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`\n✅ Server is running on http://localhost:${info.port}`);
  console.log(`\n📚 Available routes:`);
  console.log(`   GET  /                              - API 정보`);
  console.log(`   GET  /health                        - Health check`);
  console.log(`   WS   /ws/progress/:projectId        - WebSocket 실시간 진행`);
  console.log(`   POST /api/auth/register             - 회원가입`);
  console.log(`   POST /api/auth/login                - 로그인`);
  console.log(`   GET  /api/auth/me                   - 현재 사용자`);
  console.log(`   POST /api/auth/refresh              - 토큰 갱신`);
  console.log(`   POST /api/auth/change-password       - 비밀번호 변경`);
  console.log(`   GET  /api/oauth/providers            - OAuth 제공자 상태`);
  console.log(`   GET  /api/oauth/google               - Google OAuth`);
  console.log(`   GET  /api/oauth/github               - GitHub OAuth`);
  console.log(`   GET  /api/projects                  - 프로젝트 목록`);
  console.log(`   POST /api/projects                  - 프로젝트 생성`);
  console.log(`   GET  /api/projects/:id              - 프로젝트 상세`);
  console.log(`   PATCH /api/projects/:id             - 프로젝트 수정`);
  console.log(`   DELETE /api/projects/:id            - 프로젝트 삭제`);
  console.log(`   POST /api/generate/:projectId           - 문서 생성`);
  console.log(`   GET  /api/generate/:projectId/status    - 생성 상태 확인`);
  console.log(`   GET  /api/generate/:projectId/download  - HTML 다운로드`);
  console.log(`   GET  /api/usage                            - 사용량 조회`);
  console.log(`   POST /api/mockup/:projectId/generate       - 목업 생성`);
  console.log(`   GET  /api/mockup/:projectId                - 목업 목록`);
  console.log(`   GET  /api/mockup/:projectId/preview/:id    - 목업 미리보기`);
  console.log(`   POST /api/share/:projectId/share            - 공유 링크 생성`);
  console.log(`   GET  /api/share/view/:shareToken             - 공유 문서 보기`);
  console.log(`   GET  /api/versions/:projectId                - 버전 목록`);
  console.log(`   GET  /api/versions/:projectId/:versionId     - 버전 상세`);
  console.log(`   POST /api/versions/:projectId/:versionId/restore - 버전 복원`);
  console.log(`   POST /api/comments/:projectId                - 댓글 추가`);
  console.log(`   GET  /api/comments/:projectId                - 댓글 목록`);
  console.log(`   POST /api/comments/:projectId/:commentId/reply - 답글`);
  console.log(`   DELETE /api/comments/:projectId/:commentId   - 댓글 삭제`);
  console.log('');
});

// Inject WebSocket handling into the HTTP server
injectWebSocket(server);
