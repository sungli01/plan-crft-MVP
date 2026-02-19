# 배포 가이드

## 현재 배포 현황

| 구성요소 | 플랫폼 | URL |
|---------|--------|-----|
| 프론트엔드 (v2) | Vercel | https://plan-craft-frontend-v2.vercel.app |
| 백엔드 | Railway | https://plan-crft-mvp-production.up.railway.app |
| PostgreSQL | Railway | DATABASE_URL로 연결 |
| GitHub | - | sungli01/plan-crft-MVP |

---

## 백엔드 — Railway 배포

### 1. Railway 프로젝트 설정

1. [Railway](https://railway.app) 로그인
2. "New Project" → "Deploy from GitHub repo"
3. `sungli01/plan-crft-MVP` 레포 연결
4. Root Directory를 `plan-craft-backend`로 설정

### 2. PostgreSQL 추가

1. Railway 프로젝트에서 "+ New Service" → "Database" → "PostgreSQL"
2. 생성된 `DATABASE_URL`을 백엔드 서비스 환경변수에 자동 연결

### 3. 환경변수 설정

Railway 백엔드 서비스의 "Variables" 탭에서 설정:

```
NODE_ENV=production
PORT=8000
DATABASE_URL=${{Postgres.DATABASE_URL}}    # Railway 자동 연결
JWT_SECRET=<강력한 랜덤 문자열>
FRONTEND_URL=https://plan-craft-frontend-v2.vercel.app
ALLOWED_ORIGINS=https://plan-craft-frontend-v2.vercel.app
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                      # 선택 (DALL-E)
UNSPLASH_ACCESS_KEY=...                    # 선택
BRAVE_SEARCH_API_KEY=...                   # 선택
```

### 4. 빌드/배포 설정

Railway는 `nixpacks.toml`과 `railway.json`을 자동 감지합니다.

- **`nixpacks.toml`**: Node.js 빌드 환경 설정
- **`railway.json`**: 빌드/시작 명령 설정
- **`Procfile`**: `web: node start.js`
- **시작 스크립트**: `start.js` → tsx로 TypeScript 직접 실행

### 5. 배포 확인

```bash
curl https://plan-crft-mvp-production.up.railway.app/health
# {"status":"ok","database":"connected",...}
```

---

## 프론트엔드 — Vercel 배포

### 1. Vercel 프로젝트 설정

1. [Vercel](https://vercel.com) 로그인
2. "Import Project" → `sungli01/plan-crft-MVP` 레포 연결
3. **Framework Preset**: Vite
4. **Root Directory**: `plan-craft-frontend-v2`
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`

### 2. 환경변수 설정

Vercel 프로젝트 Settings → Environment Variables:

```
VITE_API_URL=https://plan-crft-mvp-production.up.railway.app
```

> ⚠️ Vite 환경변수는 `VITE_` 접두사가 있어야 빌드 시 포함됩니다.

### 3. 배포

- GitHub에 push하면 자동 배포
- 또는 Vercel 대시보드에서 "Redeploy"

### 4. SPA 라우팅

Vercel은 SPA 프레임워크를 자동 감지하여 모든 경로를 `index.html`로 리다이렉트합니다. 별도의 `vercel.json` 설정이 필요하지 않습니다.

---

## 커스텀 도메인 설정

### Vercel (프론트엔드)
1. Vercel 프로젝트 → Settings → Domains
2. 도메인 추가 (예: `plancraft.kr`)
3. DNS에 CNAME 레코드 추가: `cname.vercel-dns.com`
4. SSL 자동 발급

### Railway (백엔드)
1. Railway 서비스 → Settings → Domains
2. 커스텀 도메인 추가 (예: `api.plancraft.kr`)
3. DNS에 CNAME 레코드 추가 (Railway 제공)
4. SSL 자동 발급

> 도메인 변경 시 `FRONTEND_URL`, `ALLOWED_ORIGINS`, `VITE_API_URL` 환경변수도 함께 업데이트해야 합니다.

---

## 비용

| 항목 | 비용 |
|------|------|
| Railway (백엔드 + PostgreSQL) | ~$5/월 (Starter) |
| Vercel (프론트엔드) | 무료 (Hobby) |
| Claude API | 문서당 $5~6 |
| DALL-E API | 선택적 (이미지당 ~$0.04) |
