# 백엔드 가이드

## 디렉토리 구조

```
plan-craft-backend/
├── src/
│   ├── index.ts                 # 서버 엔트리포인트 (Hono 앱, 라우트 등록, WebSocket)
│   ├── db/
│   │   ├── schema-pg.ts         # Drizzle ORM 스키마 정의
│   │   └── index.ts             # DB 연결 및 초기화
│   ├── routes/
│   │   ├── auth.ts              # 인증 (register, login, refresh, me, change-password, profile)
│   │   ├── oauth.ts             # Google/GitHub OAuth
│   │   ├── projects.ts          # 프로젝트 CRUD + 일괄 삭제
│   │   ├── generate.ts          # 문서 생성, 상태 확인, 다운로드
│   │   ├── usage.ts             # 사용량 조회
│   │   ├── mockup.ts            # 목업 생성/조회
│   │   ├── sharing.ts           # 공유 링크
│   │   ├── versions.ts          # 버전 관리
│   │   ├── comments.ts          # 댓글 (인메모리)
│   │   └── admin.ts             # 관리자 API
│   ├── middleware/
│   │   ├── auth.ts              # JWT 인증 미들웨어
│   │   ├── admin.ts             # 관리자 권한 확인
│   │   └── tier.ts              # Free/Pro 티어 제한
│   ├── engine/
│   │   ├── orchestrator.ts      # 기본 순차 오케스트레이터
│   │   ├── agent-team-orchestrator.ts  # 병렬 오케스트레이터 (실제 사용)
│   │   ├── model-router.ts      # 에이전트/섹션별 모델 라우팅
│   │   ├── token-tracker.ts     # 토큰 사용량 추적
│   │   ├── agents/
│   │   │   ├── researcher.ts    # 리서치 에이전트
│   │   │   ├── architect.ts     # 문서 구조 설계 에이전트
│   │   │   ├── writer.ts        # 내용 작성 에이전트
│   │   │   ├── image-curator.ts # 이미지 큐레이션 에이전트
│   │   │   ├── reviewer.ts      # 품질 검수 에이전트
│   │   │   └── mockup-generator.ts # 목업 생성 에이전트
│   │   └── services/
│   │       ├── unsplash.ts      # Unsplash 이미지 검색
│   │       ├── brave-image-search.ts # Brave 이미지 검색
│   │       ├── dalle.ts         # DALL-E 이미지 생성
│   │       ├── dalle-v2.ts      # DALL-E v2
│   │       ├── arxiv.ts         # arXiv 논문 검색
│   │       ├── semantic-scholar.ts # Semantic Scholar 검색
│   │       └── public-data.ts   # 공공 데이터 서비스
│   ├── services/
│   │   └── document-generator.ts # 문서 생성 서비스
│   ├── ws/
│   │   └── progress-ws.ts       # WebSocket 연결 관리
│   ├── cache/
│   │   └── redis.ts             # Redis 캐시 (선택적)
│   └── utils/
│       ├── html-generator.ts    # HTML 문서 생성
│       ├── progress-tracker.ts  # 진행상황 추적
│       └── data-masking.ts      # 민감정보 마스킹
├── tests/
│   ├── schema.test.js
│   ├── data-masking.test.js
│   ├── progress-tracker.test.js
│   └── orchestrator.test.js
├── migrations/
│   └── add-cascade-delete.sql
├── scripts/
│   └── run-migration.ts
├── init-db.sql                  # 초기 DB 스키마 SQL
├── start.js                     # 프로덕션 시작 스크립트
├── package.json
├── tsconfig.json
├── vitest.config.js
├── drizzle.config.js
├── nixpacks.toml                # Railway 빌드 설정
├── railway.json                 # Railway 배포 설정
├── Procfile                     # Railway 프로세스 파일
└── .env.example
```

## DB 스키마

Drizzle ORM으로 정의 (`src/db/schema-pg.ts`):

### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 자동 생성 |
| email | TEXT (UNIQUE, NOT NULL) | 이메일 |
| passwordHash | TEXT (NOT NULL) | bcrypt 해시 (OAuth는 빈 문자열) |
| name | TEXT | 이름 |
| plan | TEXT | `'free'` \| `'pro'` |
| oauthProvider | TEXT | `'google'` \| `'github'` \| null |
| oauthId | TEXT | OAuth 제공자 ID |
| tier | TEXT | `'free'` \| `'pro'` |
| role | TEXT | `'user'` \| `'admin'` |
| approved | BOOLEAN | 관리자 승인 여부 (기본 false) |
| loginAttempts | INTEGER | 로그인 실패 횟수 |
| lockedUntil | TEXT | 잠금 해제 시각 |
| createdAt | TIMESTAMP | 생성일 |
| updatedAt | TIMESTAMP | 수정일 |

### projects
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 자동 생성 |
| userId | UUID (FK → users.id) | 소유자 |
| title | TEXT (NOT NULL) | 제목 |
| idea | TEXT (NOT NULL) | 아이디어 설명 |
| referenceDoc | TEXT | 참고 문서 |
| status | TEXT | `'draft'` \| `'generating'` \| `'completed'` \| `'failed'` |
| model | TEXT | 사용 모델 (기본 `'claude-opus-4'`) |
| errorMessage | TEXT | 실패 시 에러 메시지 |
| createdAt | TIMESTAMP | 생성일 |
| updatedAt | TIMESTAMP | 수정일 |

### documents
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 자동 생성 |
| projectId | UUID (FK → projects.id, CASCADE) | 프로젝트 |
| contentHtml | TEXT | 생성된 HTML 문서 |
| contentPdfUrl | TEXT | PDF URL (미사용) |
| qualityScore | REAL | 품질 점수 (0-100) |
| sectionCount | INTEGER | 섹션 수 |
| wordCount | INTEGER | 단어 수 |
| imageCount | INTEGER | 이미지 수 |
| metadata | TEXT (JSON) | 메타데이터 (version, reviewRound, tokenUsage 등) |
| createdAt | TIMESTAMP | 생성일 |
| generatedAt | TIMESTAMP | 생성 완료일 |

### mockups
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 자동 생성 |
| projectId | UUID (FK → projects.id, CASCADE) | 프로젝트 |
| userId | UUID (FK → users.id) | 생성자 |
| html | TEXT (NOT NULL) | 목업 HTML |
| style | TEXT | 스타일 (기본 `'modern'`) |
| metadata | TEXT | JSON 메타데이터 |
| createdAt | TIMESTAMP | 생성일 |
| expiresAt | TIMESTAMP | 만료일 |

### token_usage
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 자동 생성 |
| userId | UUID (FK → users.id) | 사용자 |
| projectId | UUID (FK → projects.id, CASCADE) | 프로젝트 |
| model | TEXT (NOT NULL) | 사용 모델명 |
| inputTokens | INTEGER (NOT NULL) | 입력 토큰 수 |
| outputTokens | INTEGER (NOT NULL) | 출력 토큰 수 |
| totalTokens | INTEGER (NOT NULL) | 총 토큰 수 |
| costUsd | REAL (NOT NULL) | 예상 비용 (USD) |
| createdAt | TIMESTAMP | 생성일 |

## 환경변수

`.env.example` 기반:

| 변수명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| `PORT` | ❌ | 서버 포트 | `8000` |
| `NODE_ENV` | ❌ | 실행 환경 | `development` \| `production` |
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | ✅ | JWT 서명 키 (미설정 시 자동 생성, 재시작 시 리셋) | 랜덤 문자열 |
| `JWT_REFRESH_SECRET` | ❌ | Refresh Token 키 (기본: JWT_SECRET + '_refresh') | 랜덤 문자열 |
| `FRONTEND_URL` | ✅ | 프론트엔드 URL (CORS) | `https://plan-craft-frontend-v2.vercel.app` |
| `ALLOWED_ORIGINS` | ❌ | 쉼표 구분 허용 Origin | `http://localhost:3000,https://...` |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic Claude API 키 | `sk-ant-...` |
| `OPENAI_API_KEY` | ❌ | OpenAI API 키 (DALL-E 이미지 생성) | `sk-...` |
| `UNSPLASH_ACCESS_KEY` | ❌ | Unsplash 이미지 검색 | Access Key |
| `BRAVE_SEARCH_API_KEY` | ❌ | Brave 이미지 검색 | API Key |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth 클라이언트 ID | |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth 시크릿 | |
| `GITHUB_CLIENT_ID` | ❌ | GitHub OAuth 클라이언트 ID | |
| `GITHUB_CLIENT_SECRET` | ❌ | GitHub OAuth 시크릿 | |
| `BACKEND_URL` | ❌ | OAuth 콜백 URL용 백엔드 주소 | `http://localhost:3001` |

## AI 엔진 파이프라인 상세

### AgentTeamOrchestrator

`src/engine/agent-team-orchestrator.ts`에 정의. 기본 `Orchestrator`와 달리 Writer를 **병렬 팀(기본 3명)**으로 실행하여 속도를 높임.

**생성 흐름:**
1. **Researcher** — 프로젝트 아이디어 기반 시장/경쟁사 리서치
2. **Architect** — 문서 구조 설계 (대제목, 소제목, 이미지 요구사항)
3. **Writer Team** — 섹션을 WriterAgent 3개가 분담하여 병렬 작성
4. **ImageCurator** — 각 섹션에 적합한 이미지 검색/생성
5. **Reviewer** — 섹션별 품질 점수 (0-100) 평가

### 이미지 소스 우선순위
1. Brave Image Search
2. Unsplash API
3. DALL-E (OpenAI) — 검색 결과 부족 시 AI 생성

### 모델 매핑
코드에서 약칭을 실제 모델명으로 변환:
```
'claude-opus-4'         → 'claude-opus-4-6'
'claude-sonnet-4'       → 'claude-sonnet-4-5-20250929'
'claude-sonnet-4-5'     → 'claude-sonnet-4-5-20250929'
```

## 주요 스크립트

| 스크립트 | 명령 | 설명 |
|---------|------|------|
| `dev` | `tsx watch src/index.ts` | 개발 서버 (핫 리로드) |
| `start` | `node start.js` | 프로덕션 서버 |
| `test` | `vitest run` | 테스트 실행 |
| `test:watch` | `vitest` | 테스트 와치 모드 |
| `typecheck` | `tsc --noEmit` | 타입 체크 |
| `db:generate` | `drizzle-kit generate` | 마이그레이션 생성 |
| `db:migrate` | `tsx src/db/migrate.ts` | 마이그레이션 실행 |
| `db:studio` | `drizzle-kit studio` | Drizzle Studio (DB GUI) |
