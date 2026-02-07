# Plan-Craft Backend API

Plan-Craft v3.0 멀티 에이전트 문서 생성 시스템의 백엔드 API 서버입니다.

## 🚀 Features

- ✅ JWT 기반 사용자 인증
- ✅ 프로젝트 CRUD API
- ✅ Plan-Craft v3.0 멀티 에이전트 문서 생성
- ✅ 4개 AI 에이전트 (Architect, Writer, Image Curator, Reviewer)
- ✅ 실시간 생성 상태 추적
- ✅ HTML 문서 다운로드

## 📊 Tech Stack

- **Runtime**: Node.js 24.x
- **Framework**: Hono
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **ORM**: Drizzle ORM
- **AI**: Anthropic Claude Opus 4, Claude Sonnet 4

## 🛠️ Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev
```

## 🌐 Deployment

Railway 배포 가이드: [DEPLOY.md](./DEPLOY.md)

## 📝 Environment Variables

```env
DATABASE_URL=postgresql://...  # PostgreSQL connection string
PORT=8000
NODE_ENV=production
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-frontend.vercel.app
ANTHROPIC_API_KEY=sk-ant-...
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### Projects
- `GET /api/projects` - 프로젝트 목록
- `POST /api/projects` - 프로젝트 생성
- `GET /api/projects/:id` - 프로젝트 상세
- `PATCH /api/projects/:id` - 프로젝트 수정
- `DELETE /api/projects/:id` - 프로젝트 삭제

### Document Generation
- `POST /api/generate/:projectId` - 문서 생성 시작
- `GET /api/generate/:projectId/status` - 생성 상태 확인
- `GET /api/generate/:projectId/download` - HTML 다운로드

## 📄 License

MIT
