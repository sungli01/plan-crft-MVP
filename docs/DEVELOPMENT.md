# 로컬 개발 환경 설정

## 필수 요구사항

- **Node.js** 18.x 이상 (권장: 24.x)
- **PostgreSQL** 15+ (로컬 또는 Docker)
- **Anthropic API Key** (필수 — 문서 생성에 필요)

## 1단계: 저장소 클론

```bash
git clone https://github.com/sungli01/plan-crft-MVP.git
cd plan-crft-MVP
```

## 2단계: 백엔드 설정

```bash
cd plan-craft-backend
npm install
```

### 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
PORT=8000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/plancraft
JWT_SECRET=local-dev-secret-change-me
FRONTEND_URL=http://localhost:8080
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 선택 (이미지 기능 활성화)
OPENAI_API_KEY=sk-...
UNSPLASH_ACCESS_KEY=...
BRAVE_SEARCH_API_KEY=...
```

### PostgreSQL 데이터베이스 생성

```bash
# PostgreSQL에 접속하여 DB 생성
createdb plancraft

# 또는 Docker로 실행
docker run -d --name plancraft-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=plancraft \
  -p 5432:5432 \
  postgres:15
```

DB 스키마는 서버 시작 시 자동으로 초기화됩니다 (`initializeDatabase()`).

### 백엔드 실행

```bash
npm run dev
# ✅ Server is running on http://localhost:8000
```

## 3단계: 프론트엔드 설정

```bash
cd ../plan-craft-frontend-v2
npm install
```

### 환경변수 설정

`.env` 파일 생성 (`.env.example` 참고):
```env
VITE_API_URL=http://localhost:8000
```

### 프론트엔드 실행

```bash
npm run dev
# 브라우저에서 http://localhost:8080 접속
```

## 4단계: 첫 사용자 생성

1. http://localhost:8080/register 에서 회원가입
2. 이메일이 `sungli01@naver.com`이면 자동으로 admin + 승인됨
3. 다른 이메일은 DB에서 직접 승인 필요:

```sql
UPDATE users SET approved = true WHERE email = 'your@email.com';
```

또는 admin 계정으로 로그인 후 `/admin` 페이지에서 승인.

## API 키 목록

| 키 | 필수 | 용도 | 발급처 |
|----|------|------|--------|
| ANTHROPIC_API_KEY | ✅ | Claude AI 문서 생성 | https://console.anthropic.com |
| OPENAI_API_KEY | ❌ | DALL-E 이미지 생성 | https://platform.openai.com |
| UNSPLASH_ACCESS_KEY | ❌ | 무료 이미지 검색 | https://unsplash.com/developers |
| BRAVE_SEARCH_API_KEY | ❌ | 이미지 검색 | https://brave.com/search/api |
| GOOGLE_CLIENT_ID/SECRET | ❌ | Google OAuth | https://console.cloud.google.com |
| GITHUB_CLIENT_ID/SECRET | ❌ | GitHub OAuth | https://github.com/settings/developers |

> 이미지 관련 API 키 없이도 문서 생성은 가능합니다 (이미지 없는 문서).

## 테스트

```bash
cd plan-craft-backend

# 전체 테스트
npm test

# 와치 모드
npm run test:watch

# 커버리지
npm run test:coverage

# 타입 체크
npm run typecheck
```

테스트 파일: `tests/` 디렉토리
- `schema.test.js` — DB 스키마 검증
- `data-masking.test.js` — 민감정보 마스킹
- `progress-tracker.test.js` — 진행상황 추적
- `orchestrator.test.js` — 오케스트레이터

## 코딩 컨벤션

- **언어**: TypeScript (strict mode)
- **프레임워크**: 백엔드 Hono, 프론트엔드 React
- **스타일**: ESLint 설정 적용
- **ORM**: Drizzle ORM (SQL 마이그레이션)
- **네이밍**:
  - 파일: kebab-case (`agent-team-orchestrator.ts`)
  - 클래스/타입: PascalCase (`AgentTeamOrchestrator`)
  - 함수/변수: camelCase (`generateDocument`)
- **모듈**: ESM (`"type": "module"`)
- **에러 메시지**: 한국어 (사용자 대면), 영어 (로그/내부)
- **API 응답**: JSON, 에러 시 `{ error: "메시지" }` 형식

## 유용한 명령어

```bash
# DB Studio (GUI)
cd plan-craft-backend && npm run db:studio

# 프론트엔드 소스맵 빌드 (디버깅)
cd plan-craft-frontend-v2 && npm run build:dev
```
