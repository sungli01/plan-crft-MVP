# Plan-Craft v3.0 MVP 배포 가이드

## 📋 배포 순서

### 1️⃣ Railway 백엔드 배포 (15분)
### 2️⃣ Vercel 프론트엔드 배포 (5분)
### 3️⃣ 통합 테스트 (5분)

---

## 1️⃣ Railway 백엔드 배포

### Step 1: Railway 계정 생성
1. https://railway.app 접속
2. "Login with GitHub" 클릭
3. GitHub 계정 연동

### Step 2: GitHub 레포지토리 준비 (필요시)
**옵션 A: 기존 GitHub 레포지토리 사용**
- plan-craft-backend 폴더를 GitHub에 push

**옵션 B: Railway CLI 사용 (로컬 배포)**
```bash
npm i -g @railway/cli
railway login
cd plan-craft-backend
railway init
railway up
```

### Step 3: Railway 프로젝트 생성
1. Railway 대시보드에서 "New Project" 클릭
2. "Empty Project" 선택
3. 프로젝트 이름: `plan-craft-backend`

### Step 4: PostgreSQL 추가
1. 프로젝트 내 "+ New" 클릭
2. "Database" → "Add PostgreSQL" 선택
3. 자동으로 DATABASE_URL 생성됨

### Step 5: 백엔드 서비스 추가
**옵션 A: GitHub 연동**
1. "+ New" → "GitHub Repo" 선택
2. plan-craft-backend 선택 (또는 레포지토리 root)

**옵션 B: CLI로 배포**
```bash
cd plan-craft-backend
railway up
```

### Step 6: 환경변수 설정
Railway 대시보드 → 백엔드 서비스 → Variables 탭:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=8000
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-this-2026
FRONTEND_URL=https://your-app.vercel.app
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**주의**: FRONTEND_URL은 Vercel 배포 후 업데이트!

### Step 7: 배포 설정
- Settings → Build & Deploy
  - Build Command: `npm install`
  - Start Command: `node src/index.js`

### Step 8: 데이터베이스 초기화
PostgreSQL 서비스 → Data 탭 → Query:

```sql
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
  model TEXT DEFAULT 'claude-opus-4-20250514',
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

### Step 9: 배포 확인
```bash
curl https://your-backend.up.railway.app/health
```

**성공 응답:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-02-07T..."
}
```

**✅ 백엔드 URL 복사:** `https://plan-craft-backend-production-xxxx.up.railway.app`

---

## 2️⃣ Vercel 프론트엔드 배포

### Step 1: Vercel 계정 생성
1. https://vercel.com 접속
2. "Continue with GitHub" 클릭

### Step 2: 프로젝트 Import
1. Vercel 대시보드 → "Add New..." → "Project"
2. "Import Git Repository" 선택
3. GitHub 레포지토리 선택

### Step 3: 프로젝트 설정
- **Framework**: Next.js (자동 감지)
- **Root Directory**: `plan-craft-web` (모노레포인 경우)
- **Build Command**: `npm run build` (기본값)
- **Output Directory**: `.next` (기본값)

### Step 4: 환경변수 설정
```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

**중요**: Railway 백엔드 URL을 여기에 입력!

### Step 5: 배포 실행
- "Deploy" 버튼 클릭
- 빌드 진행 상황 확인 (2-3분)
- 배포 완료!

**✅ 프론트엔드 URL:** `https://plan-craft-web-xxxx.vercel.app`

### Step 6: Railway 백엔드 CORS 업데이트
1. Railway 대시보드 → 백엔드 서비스 → Variables
2. `FRONTEND_URL` 환경변수 업데이트:
   ```
   FRONTEND_URL=https://plan-craft-web-xxxx.vercel.app
   ```
3. 자동 재배포 대기 (1-2분)

---

## 3️⃣ 통합 테스트

### Step 1: 홈 페이지 확인
1. Vercel URL 접속
2. 페이지 로드 확인
3. 로그인/회원가입 버튼 확인

### Step 2: 회원가입
1. "회원가입" 클릭
2. 이메일, 비밀번호, 이름 입력
3. 회원가입 성공 → 대시보드 이동

### Step 3: 프로젝트 생성
1. "+ 새 프로젝트" 클릭
2. 프로젝트 제목, 아이디어 입력
3. "생성 시작" 클릭

### Step 4: 문서 생성 대기
- 상태: "생성 중..." 표시
- 약 20-30분 소요
- 페이지 새로고침으로 상태 확인

### Step 5: 다운로드
- 상태: "완료" → "📥 HTML 다운로드" 버튼 활성화
- 다운로드 클릭
- HTML 파일 저장 확인

---

## ✅ 배포 완료 체크리스트

- [ ] Railway PostgreSQL 생성
- [ ] Railway 백엔드 배포
- [ ] 백엔드 환경변수 설정
- [ ] 데이터베이스 테이블 생성
- [ ] 백엔드 Health Check 성공
- [ ] Vercel 프론트엔드 배포
- [ ] 프론트엔드 환경변수 설정 (NEXT_PUBLIC_API_URL)
- [ ] 백엔드 FRONTEND_URL 업데이트
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 프로젝트 생성 테스트
- [ ] 문서 생성 테스트 (20-30분)
- [ ] HTML 다운로드 테스트

---

## 💰 비용 안내

### Railway
- **Starter 플랜**: $5/월
  - $5 크레딧 포함
  - PostgreSQL 무료
  - 문서 생성 1회 = 약 $5-6
  - **추천**: 테스트용으로 월 1-2회 생성 가능

### Vercel
- **Hobby 플랜**: 무료
  - 월 100GB 대역폭
  - 무제한 배포
  - HTTPS 자동

### Claude API
- **문서 생성당**: $5-6
  - Opus 4: 15만 토큰 사용
  - 고품질 87+ 점수

---

## 🔧 문제 해결

### CORS 오류
→ Railway FRONTEND_URL 확인 및 재배포

### API 연결 실패
→ NEXT_PUBLIC_API_URL 확인
→ Railway 백엔드 실행 상태 확인

### 문서 생성 실패
→ Railway 로그 확인
→ ANTHROPIC_API_KEY 환경변수 확인
→ DATABASE_URL 연결 확인

### 데이터베이스 연결 실패
→ PostgreSQL 서비스 실행 확인
→ Private Networking 활성화 확인

---

## 📞 지원

문제 발생 시:
1. Railway/Vercel 로그 확인
2. 브라우저 개발자 도구 (F12) Console 확인
3. 네트워크 탭에서 API 요청/응답 확인

---

**축하합니다! Plan-Craft v3.0 MVP 배포 완료!** 🎉
