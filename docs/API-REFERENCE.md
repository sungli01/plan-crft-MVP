# API 레퍼런스

**Base URL**: `https://plan-crft-mvp-production.up.railway.app`

## 인증 방식

대부분의 API는 JWT Bearer 토큰 인증이 필요합니다.

```
Authorization: Bearer <accessToken>
```

Access Token 만료 시 Refresh Token으로 갱신합니다.

---

## 일반

### `GET /`
API 서버 정보.
```json
{ "message": "Plan-Craft API Server", "version": "1.0.0", "status": "running" }
```

### `GET /health`
헬스체크.
```json
{ "status": "ok", "database": "connected", "wsConnections": 0, "cacheType": "memory", "timestamp": "..." }
```

### `GET /metrics`
서버 성능 지표 (인증 불필요).
```json
{ "uptime": 3600, "uptimeHuman": "1h 0m", "memory": { "rss": "80MB", ... }, "nodeVersion": "v24.x", ... }
```

---

## 인증 (`/api/auth`)

### `POST /api/auth/register`
회원가입. 관리자 승인 전까지 로그인 불가.

**Body:**
```json
{ "email": "user@example.com", "password": "12345678", "name": "홍길동" }
```
- `email`: 필수, 유효한 이메일
- `password`: 필수, 최소 8자
- `name`: 선택, 최소 2자

**응답 (201):**
```json
{
  "message": "회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
  "user": { "id": "uuid", "email": "...", "name": "...", "plan": "free", "approved": false },
  "pendingApproval": true
}
```

### `POST /api/auth/login`
로그인. 5회 실패 시 15분 잠금.

**Body:**
```json
{ "email": "user@example.com", "password": "12345678" }
```

**응답 (200):**
```json
{
  "message": "로그인 성공",
  "user": { "id": "uuid", "email": "...", "name": "...", "plan": "free", "role": "user", "approved": true },
  "token": "jwt...",
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

**에러 (403):** 미승인 사용자 → `{ "error": "관리자 승인 대기 중...", "code": "PENDING_APPROVAL" }`

### `POST /api/auth/refresh`
토큰 갱신.

**Body:** `{ "refreshToken": "jwt..." }`
**응답:** `{ "accessToken": "...", "refreshToken": "..." }`

### `GET /api/auth/me` 🔒
현재 사용자 정보.

**응답:**
```json
{ "user": { "id": "uuid", "email": "...", "name": "...", "plan": "free", "role": "user", "approved": true, "createdAt": "..." } }
```

### `POST /api/auth/change-password` 🔒
비밀번호 변경.

**Body:** `{ "oldPassword": "...", "newPassword": "..." }` (새 비밀번호 최소 8자)

### `PATCH /api/auth/profile` 🔒
프로필 업데이트 (이름 변경).

**Body:** `{ "name": "새이름" }`

---

## OAuth (`/api/oauth`)

### `GET /api/oauth/providers`
OAuth 제공자 활성화 상태.

### `GET /api/oauth/google`
Google OAuth 시작 (리다이렉트).

### `GET /api/oauth/google/callback`
Google OAuth 콜백.

### `GET /api/oauth/github`
GitHub OAuth 시작 (리다이렉트).

### `GET /api/oauth/github/callback`
GitHub OAuth 콜백.

---

## 프로젝트 (`/api/projects`) 🔒

모든 엔드포인트에 인증 필요.

### `GET /api/projects`
내 프로젝트 목록 (최신순).

**응답:**
```json
{
  "projects": [
    { "id": "uuid", "title": "...", "idea": "...(100자 요약)", "status": "draft|generating|completed|failed", "model": "claude-opus-4", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### `POST /api/projects`
프로젝트 생성. 입력에 민감정보가 있으면 자동 마스킹됨.

**Body:**
```json
{
  "title": "AI 헬스케어 플랫폼",
  "idea": "AI 기반 개인 맞춤형 건강 관리 서비스로...",
  "model": "claude-opus-4",
  "referenceDoc": "참고 문서 내용 (선택)"
}
```
- `title`: 필수, 5~500자
- `idea`: 필수, 최소 20자
- `model`: 선택, `claude-opus-4` | `claude-sonnet-4` | `gpt-4-turbo`

**응답 (201):** `{ "message": "...", "project": {...}, "security": { "maskedData": false, "detections": [] } }`

### `GET /api/projects/:id`
프로젝트 상세 (최신 문서 포함).

### `PATCH /api/projects/:id`
프로젝트 수정.

**Body:** title, idea, model, status 중 선택.

### `DELETE /api/projects/:id`
프로젝트 삭제 (연관 문서, 목업, 토큰사용량도 함께 삭제).

### `POST /api/projects/bulk-delete`
일괄 삭제.

**Body:** `{ "projectIds": ["uuid1", "uuid2"] }`

---

## 문서 생성 (`/api/generate`) 🔒

### `POST /api/generate/:projectId`
문서 생성 시작. 비동기 처리 (즉시 202 응답). Tier 체크 적용.

**응답 (202):**
```json
{ "message": "Document generation started", "projectId": "uuid", "version": 1, "status": "generating" }
```

### `POST /api/generate/:projectId/regenerate`
같은 프로젝트로 새 버전 문서 재생성. Tier 체크 적용.

**응답 (202):** 위와 동일 (version 번호 증가).

### `GET /api/generate/:projectId/status`
생성 상태 및 실시간 진행상황 조회.

**응답:**
```json
{
  "projectId": "uuid",
  "status": "generating",
  "totalVersions": 1,
  "currentVersion": 1,
  "progress": {
    "phase": "writing",
    "agents": { "architect": { "status": "done", "progress": 100 }, ... },
    "logs": [...],
    "overallProgress": 65,
    "estimatedMinutes": 15,
    "remainingMinutes": 8
  },
  "document": null
}
```

### `GET /api/generate/:projectId/download`
최신 문서 HTML 다운로드. `?docId=uuid`로 특정 버전 지정 가능.

### `GET /api/generate/:projectId/download/pdf`
PDF용 인쇄 최적화 HTML. `?token=jwt`로 쿼리 파라미터 인증도 지원.

### `GET /api/generate/:projectId/versions`
해당 프로젝트의 문서 버전 목록.

---

## WebSocket

### `WS /ws/progress/:projectId`
실시간 문서 생성 진행상황 수신.

---

## 사용량 (`/api/usage`) 🔒

### `GET /api/usage`
현재 사용자의 월간 사용량 및 티어 정보.

```json
{
  "tier": "free",
  "usage": { "monthly": 3, "limit": 50, "remaining": 47 },
  "features": { "maxSections": 15, "model": "sonnet", "deepResearch": false }
}
```

---

## 목업 (`/api/mockup`) 🔒

### `POST /api/mockup/:projectId/generate`
AI 목업 생성. Tier 체크 적용.

**Body:** `{ "style": "modern", "colorScheme": "blue" }`

### `GET /api/mockup/:projectId`
프로젝트 목업 목록.

### `GET /api/mockup/:projectId/preview/:id`
목업 미리보기 HTML.

---

## 공유 (`/api/share`) 🔒

### `POST /api/share/:projectId/share`
공유 링크 생성.

**Body:** `{ "permission": "view", "password": "optional", "expiresInDays": 7 }`

### `GET /api/share/view/:shareToken`
공유 문서 조회 (인증 불필요, 현재 미구현 501).

---

## 버전 관리 (`/api/versions`) 🔒

### `GET /api/versions/:projectId`
문서 버전 목록.

### `GET /api/versions/:projectId/:versionId`
특정 버전 상세.

### `POST /api/versions/:projectId/:versionId/restore`
버전 복원 (해당 버전을 복사하여 새 문서 생성).

---

## 댓글 (`/api/comments`) 🔒

### `POST /api/comments/:projectId`
댓글 추가.

**Body:** `{ "text": "수정 필요", "sectionIndex": 3, "position": null }`

### `GET /api/comments/:projectId`
댓글 목록.

### `POST /api/comments/:projectId/:commentId/reply`
답글 추가. **Body:** `{ "text": "답글 내용" }`

### `DELETE /api/comments/:projectId/:commentId`
댓글 삭제 (본인 댓글만).

> ⚠️ 댓글은 현재 인메모리 저장이므로 서버 재시작 시 초기화됩니다.

---

## 관리자 (`/api/admin`) 🔒👑

모든 엔드포인트에 admin 역할 필요.

### `GET /api/admin/users`
전체 사용자 목록 (프로젝트 수, 토큰 사용량 포함).

### `PATCH /api/admin/users/:id`
사용자 플랜 변경. **Body:** `{ "plan": "pro" }`

### `PATCH /api/admin/users/:id/approve`
사용자 승인.

### `DELETE /api/admin/users/:id`
사용자 삭제.

### `GET /api/admin/stats`
전체 통계.

### `GET /api/admin/stats/tokens`
토큰 사용 상세 통계.

---

## Rate Limiting

| 엔드포인트 | 제한 |
|-----------|------|
| `/api/generate/:projectId` (생성) | 시간당 5회 |
| `/api/generate/:projectId/status` | 분당 60회 |
| `/api/auth/*` | 15분당 20회 |

## Tier 제한

| 티어 | 월간 생성 | 최대 섹션 | 모델 |
|------|----------|----------|------|
| free | 50회 | 15개 | sonnet |
| pro | 무제한 | 30개 | opus |

Pro 티어는 관리자가 수동으로 부여합니다.
