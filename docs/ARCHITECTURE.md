# 아키텍처 문서

## 전체 시스템 구조

```
┌──────────────────────────────────────────────────────────────────┐
│                        Plan-Craft v3.0                           │
│                                                                  │
│  ┌─────────────────────┐         ┌─────────────────────────┐    │
│  │  Frontend (Vite+React)│         │  Backend (Hono + Node)  │    │
│  │  plan-craft-frontend-v2│◄──REST──►│  plan-craft-backend     │    │
│  │                       │  +WS    │                         │    │
│  │  • React 18           │         │  • Hono 4.x             │    │
│  │  • shadcn/ui          │         │  • Drizzle ORM          │    │
│  │  • TanStack Query     │         │  • JWT 인증             │    │
│  │  • Zustand            │         │  • WebSocket 진행상황    │    │
│  │  • React Router 6     │         │                         │    │
│  │                       │         │  Vercel에 배포           │    │
│  │  Vercel에 배포         │         │  Railway에 배포          │    │
│  └─────────────────────┘         └───────────┬─────────────┘    │
│                                               │                  │
│                              ┌────────────────┼──────────────┐  │
│                              │                │              │  │
│                              ▼                ▼              ▼  │
│                     ┌──────────────┐  ┌────────────┐  ┌───────┐│
│                     │  PostgreSQL  │  │ Anthropic  │  │Unsplash││
│                     │  (Railway)   │  │ Claude API │  │ API   ││
│                     └──────────────┘  └────────────┘  └───────┘│
│                                       ┌────────────┐  ┌───────┐│
│                                       │ OpenAI API │  │ Brave ││
│                                       │ (DALL-E)   │  │Search ││
│                                       └────────────┘  └───────┘│
└──────────────────────────────────────────────────────────────────┘
```

## 요청 흐름

### 1. 인증 흐름
```
사용자 → POST /api/auth/register (회원가입, 관리자 승인 필요)
사용자 → POST /api/auth/login → JWT Access Token (24h) + Refresh Token (7d)
모든 API 요청 → Authorization: Bearer <accessToken>
토큰 만료 → POST /api/auth/refresh → 새 토큰 쌍 발급
```

### 2. 문서 생성 흐름
```
1. POST /api/projects          → 프로젝트 생성 (draft 상태)
2. POST /api/generate/:id      → 생성 시작 (202 Accepted, 비동기)
3. WS /ws/progress/:id         → WebSocket으로 실시간 진행상황 수신
   또는 GET /api/generate/:id/status → 폴링으로 상태 확인
4. GET /api/generate/:id/download    → 완성된 HTML 문서 다운로드
```

### 3. WebSocket 진행상황 프로토콜
클라이언트가 `/ws/progress/:projectId`에 연결하면:
- 연결 즉시 `initial_state` 메시지로 현재 상태 전송
- 이후 각 에이전트 단계별로 실시간 업데이트 브로드캐스트
- 메시지 형식:
```json
{
  "type": "initial_state",
  "phase": "writing",
  "agents": { "architect": {...}, "writer": {...} },
  "logs": [...],
  "overallProgress": 45,
  "startedAt": "...",
  "updatedAt": "..."
}
```

## 멀티에이전트 파이프라인

문서 생성은 `AgentTeamOrchestrator`가 4단계 에이전트를 순차+병렬로 실행합니다.

```
┌─────────────────────────────────────────────────────────┐
│              AgentTeamOrchestrator                       │
│                                                         │
│  Phase 1: Researcher (리서치)                            │
│  └─ ResearchAgent: 프로젝트 아이디어 기반 시장 조사       │
│                                                         │
│  Phase 2: Architect (설계)                               │
│  └─ ArchitectAgent: 문서 구조/섹션 설계                  │
│     모델: Claude Opus 4                                  │
│                                                         │
│  Phase 3: Writer (작성) — 병렬 처리                       │
│  ├─ WriterAgent-1 ─┐                                    │
│  ├─ WriterAgent-2 ─┼─ 각 섹션을 병렬로 작성              │
│  └─ WriterAgent-3 ─┘                                    │
│     모델: Claude Opus 4 (ModelRouter가 섹션별 라우팅)     │
│                                                         │
│  Phase 4: ImageCurator (이미지)                          │
│  └─ ImageCuratorAgent: 섹션별 이미지 큐레이션             │
│     소스: Unsplash, Brave Image Search, DALL-E           │
│     모델: Claude Sonnet 4                                │
│                                                         │
│  Phase 5: Reviewer (검수)                                │
│  └─ ReviewerAgent: 품질 점수 평가 (0-100점)              │
│     모델: Claude Sonnet 4                                │
│                                                         │
│  최종: HTML 문서 생성 → DB 저장                           │
└─────────────────────────────────────────────────────────┘
```

### 모델 라우팅 (ModelRouter)
- **Architect / Writer**: Claude Opus 4 (고품질 구조 설계 및 작성)
- **ImageCurator / Reviewer**: Claude Sonnet 4 (비용 최적화)
- `proMode` 옵션에 따라 모델 등급 조정 가능

### 토큰 추적 (TokenTracker)
- 에이전트별 입출력 토큰 수 추적
- 비용 산출 (`ModelRouter.estimateCost`)
- 생성 완료 시 `token_usage` 테이블에 저장

## 데이터베이스 구조

PostgreSQL (Drizzle ORM) — 5개 테이블:

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 (email, passwordHash, plan, role, approved, OAuth 정보) |
| `projects` | 프로젝트 (title, idea, status, model, userId FK) |
| `documents` | 생성된 문서 (contentHtml, qualityScore, wordCount, metadata) |
| `mockups` | 목업 HTML (projectId, html, style) |
| `token_usage` | API 토큰 사용량 (model, tokens, costUsd) |

자세한 스키마는 [BACKEND-GUIDE.md](./BACKEND-GUIDE.md#db-스키마)를 참조하세요.

## 보안

- **JWT 인증**: Access Token (24h) + Refresh Token (7d)
- **관리자 승인제**: 회원가입 후 admin이 승인해야 로그인 가능
- **Rate Limiting**: 생성 API 시간당 5회, 상태 API 분당 60회, 인증 API 15분당 20회
- **로그인 잠금**: 5회 실패 시 15분 잠금
- **민감정보 마스킹**: 프로젝트 입력 시 개인정보 자동 마스킹
- **보안 헤더**: X-Content-Type-Options, X-Frame-Options, HSTS 등
- **CORS**: `ALLOWED_ORIGINS` 환경변수로 허용 도메인 제한

## 캐싱

- Redis 캐시 지원 (선택적, `getCache()`)
- Redis 미연결 시 인메모리 폴백
