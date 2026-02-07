# Plan-Craft Backend 배포 가이드

## Railway 배포 (PostgreSQL + 백엔드)

### 1. Railway 계정 준비
1. https://railway.app 접속
2. GitHub 계정으로 로그인

### 2. 새 프로젝트 생성
1. "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. plan-craft-backend 레포지토리 선택 (또는 Empty Project)

### 3. PostgreSQL 추가
1. 프로젝트 대시보드에서 "+ New" 클릭
2. "Database" → "Add PostgreSQL" 선택
3. 자동으로 DATABASE_URL 환경변수 생성됨

### 4. 백엔드 서비스 추가
1. "+ New" → "GitHub Repo" (또는 "Empty Service")
2. plan-craft-backend 선택

### 5. 환경변수 설정
백엔드 서비스의 Variables 탭에서:

```
DATABASE_URL=          # PostgreSQL에서 자동 생성됨 (${{Postgres.DATABASE_URL}})
PORT=8000
NODE_ENV=production
JWT_SECRET=plan-craft-production-secret-change-this-2026
FRONTEND_URL=https://your-frontend.vercel.app
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 6. 배포 설정
- Root Directory: `/` (또는 `plan-craft-backend`)
- Build Command: `npm install`
- Start Command: `node src/index.js`

### 7. 배포 실행
- "Deploy" 버튼 클릭
- 빌드 로그 확인
- 배포 완료 후 URL 확인: `https://plan-craft-backend-production.up.railway.app`

### 8. 데이터베이스 초기화
Railway PostgreSQL은 자동으로 테이블을 생성하지 않으므로, 초기 실행 시 마이그레이션 필요:

```sql
-- Railway PostgreSQL Query 탭에서 실행
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  idea TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  model TEXT DEFAULT 'claude-opus-4',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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
);

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
);
```

### 9. 테스트
```bash
curl https://your-backend.up.railway.app/health
```

성공 시:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-02-07T..."
}
```

---

## 문제 해결

### PostgreSQL 연결 실패
- DATABASE_URL 환경변수 확인
- PostgreSQL 서비스가 실행 중인지 확인
- 네트워크 설정 확인 (Private Networking 활성화)

### 배포 실패
- 빌드 로그 확인
- Node.js 버전 확인 (최소 18.x)
- package.json scripts 확인

### 문서 생성 타임아웃
- Railway의 무료 플랜은 실행 시간 제한이 있을 수 있음
- Starter 플랜 고려 ($5/월)
