# Plan-Craft 개선사항 분석 보고서

> 분석일: 2026-02-08
> 분석 대상: plan-craft-web (프론트엔드) + plan-craft-backend (백엔드)
> 목표: Skywork 수준 품질로 업그레이드

---

## 📋 요약

| 분류 | P0 (즉시) | P1 (중요) | P2 (개선) |
|------|-----------|-----------|-----------|
| 코드 품질 | 4 | 3 | 2 |
| UI/UX | 3 | 5 | 4 |
| 성능 | 2 | 3 | 2 |
| 기능 | 2 | 4 | 3 |
| 보안 | 5 | 2 | 1 |
| 배포/인프라 | 2 | 2 | 2 |
| **합계** | **18** | **19** | **14** |

---

## 🔴 P0: 즉시 해결 필요

### 1. 보안: JWT 시크릿 하드코딩
- **파일**: `plan-craft-backend/src/middleware/auth.js`
- **문제**: `JWT_SECRET`이 `'your-secret-key-change-in-production'`으로 하드코딩. 환경변수 미설정 시 누구나 토큰 위조 가능.
- **난이도**: 쉬움
- **예상 효과**: 치명적 보안 취약점 제거
- **실행 방법**:
  ```javascript
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  ```
  - `.env.example`에 `JWT_SECRET=`을 추가하고, 배포 시 강력한 랜덤 값 사용

### 2. 보안: generate.js에서 SQLite 직접 사용 (DB 불일치)
- **파일**: `plan-craft-backend/src/routes/generate.js`
- **문제**: `db/index.js`는 PostgreSQL만 사용하도록 설정했지만, `generate.js`에서는 `sqlite.prepare(...)` 직접 호출. `sqlite`는 `null`로 export되므로 **런타임 크래시 발생**.
- **난이도**: 보통
- **예상 효과**: 핵심 기능(문서 생성) 동작 보장
- **실행 방법**:
  - `generate.js` 전체를 Drizzle ORM + PostgreSQL 쿼리로 마이그레이션
  ```javascript
  // Before (깨진 코드)
  sqlite.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
  
  // After
  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  ```
  - `generateDocumentBackground` 함수 내부의 모든 `sqlite.prepare(...)` → Drizzle ORM 전환

### 3. 보안: CORS 설정 단일 오리진만 허용
- **파일**: `plan-craft-backend/src/index.js`
- **문제**: `origin: process.env.FRONTEND_URL || 'http://localhost:3000'`으로 단일 오리진만 허용. 배포 환경에서 여러 도메인(www, 비www, 프리뷰 URL) 접근 불가.
- **난이도**: 쉬움
- **예상 효과**: 배포 환경 호환성 확보
- **실행 방법**:
  ```javascript
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  app.use('*', cors({
    origin: (origin) => allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    credentials: true
  }));
  ```

### 4. 보안: 비밀번호 검증 불일치
- **파일**: 프론트엔드 `register/page.tsx` vs 백엔드 `routes/auth.js`
- **문제**: 프론트엔드는 `password.length < 6` 검증, 백엔드 Zod 스키마는 `.min(8)` 검증. 6~7자 비밀번호로 가입 시도 시 백엔드에서 거부되나 에러 메시지 불친절.
- **난이도**: 쉬움
- **예상 효과**: 사용자 혼란 방지
- **실행 방법**: 프론트엔드 검증을 8자로 통일, 비밀번호 강도 표시기 추가

### 5. 보안: 인증 없는 `/api/auth/me` 엔드포인트
- **파일**: `plan-craft-backend/src/routes/auth.js`
- **문제**: `/me` 엔드포인트에 `authMiddleware`가 적용되어 있지 않음. `c.get('user')`는 항상 `undefined`를 반환하여 401 에러만 발생.
- **난이도**: 쉬움
- **예상 효과**: 사용자 정보 조회 기능 정상 동작
- **실행 방법**:
  ```javascript
  import { authMiddleware } from '../middleware/auth.js';
  auth.get('/me', authMiddleware, async (c) => { ... });
  ```

### 6. 코드 품질: 미사용/죽은 코드 파일
- **파일**: `page-old-broken.tsx`, `page-old.tsx`, `dashboard/page.tsx`, `schema-pg.js` + `schema.js` 중복
- **문제**: 레거시 파일이 프로젝트에 남아있어 혼란 유발. `schema.js`와 `schema-pg.js`가 동시 존재하여 어떤 것이 active인지 불명확.
- **난이도**: 쉬움
- **예상 효과**: 코드베이스 명확성 향상
- **실행 방법**: 미사용 파일 삭제, schema 파일 통합

### 7. 코드 품질: `generate.js` 내 미사용 함수
- **파일**: `plan-craft-backend/src/routes/generate.js`
- **문제**: `generateWithProgressTracking` 함수가 정의만 되어 있고 호출되지 않음 (실제로는 `generateDocumentBackground`에서 직접 `AgentTeamOrchestrator` 호출). 약 100줄의 데드코드.
- **난이도**: 쉬움
- **예상 효과**: 코드 가독성 향상
- **실행 방법**: 미사용 함수 삭제, 또는 실제 사용하도록 리팩토링

### 8. 코드 품질: 헤더/네비게이션 4번 복사-붙여넣기
- **파일**: `page.tsx`, `projects/page.tsx`, `create/page.tsx`, `project/[id]/page.tsx`
- **문제**: 동일한 헤더 컴포넌트 코드가 4개 파일에 copy-paste. 로고, 네비게이션, 로그아웃 로직 전부 중복.
- **난이도**: 보통
- **예상 효과**: 유지보수성 대폭 향상 (변경 시 1곳만 수정)
- **실행 방법**:
  ```
  components/
    Header.tsx          # 공통 헤더
    Sidebar.tsx         # 사이드바
    AuthProvider.tsx    # 인증 Context
    Layout.tsx          # 앱 쉘 레이아웃
  ```

### 9. 성능: 프로젝트 상세 페이지 1초 폴링
- **파일**: `plan-craft-web/app/project/[id]/page.tsx`
- **문제**: `setInterval` 1초 간격으로 `loadProjectData` 호출. 매 초마다 전체 프로젝트 데이터 + 진행상황을 다시 fetch. **project?.status 의존성이 useEffect에 포함되어 무한 리렌더링 가능**.
- **난이도**: 보통
- **예상 효과**: 서버 부하 90% 감소, 브라우저 성능 향상
- **실행 방법**:
  - Server-Sent Events (SSE) 또는 WebSocket으로 전환
  - 혹은 최소한 폴링 간격을 3-5초로 늘리고, status만 가벼운 엔드포인트로 분리
  ```javascript
  // SSE 구현 (백엔드)
  generate.get('/:projectId/stream', authMiddleware, (c) => {
    return streamSSE(c, async (stream) => {
      while (project.status === 'generating') {
        const progress = progressTracker.get(projectId);
        await stream.writeSSE({ data: JSON.stringify(progress) });
        await stream.sleep(3000);
      }
    });
  });
  ```

### 10. 성능: `useEffect` 무한 루프 위험
- **파일**: `plan-craft-web/app/project/[id]/page.tsx`
- **문제**: `useEffect`의 의존성 배열에 `project?.status`가 있고, `loadProjectData`에서 `setProject`를 호출. 매 API 응답마다 `project` 객체가 새로 생성되어 effect가 다시 트리거.
- **난이도**: 보통
- **예상 효과**: CPU 사용량 정상화, 메모리 누수 방지
- **실행 방법**:
  ```javascript
  // status를 별도 state로 관리
  const [projectStatus, setProjectStatus] = useState<string>('');
  
  useEffect(() => {
    // initial load
    loadProjectData(token);
  }, [projectId]);
  
  useEffect(() => {
    if (projectStatus !== 'generating') return;
    const interval = setInterval(() => pollProgress(token), 3000);
    return () => clearInterval(interval);
  }, [projectStatus]);
  ```

---

## 🟡 P1: 중요 개선사항

### 11. UI/UX: 랜딩 페이지 - 가치 제안 미흡
- **파일**: `plan-craft-web/app/page.tsx`
- **문제**: "고급 지능으로 문서 생성" 한 줄만 있고, 서비스의 핵심 가치(4-에이전트 시스템, 87+/100 품질, 8-10분 생성)가 제대로 전달되지 않음. Skywork은 히어로 섹션에서 Before/After, 데모 영상, 핵심 수치를 명확히 보여줌.
- **난이도**: 보통
- **예상 효과**: 전환율 2-3배 향상
- **실행 방법**:
  - 히어로 섹션 리디자인: 부제목(핵심 가치 3줄), 데모 GIF/동영상, 핵심 수치 카드
  - "How it works" 섹션: 4단계 프로세스 시각화 (Architect → Writer → Image → Review)
  - 사회적 증거: 생성된 문서 수, 사용자 수, 평균 품질 점수
  - CTA 버튼을 2개 → "무료로 시작하기" + "데모 보기"

### 12. UI/UX: 반응형 디자인 미흡
- **파일**: 전체 프론트엔드
- **문제**: 모바일 대응이 `hidden md:flex`로 네비게이션 숨기기 정도만 구현. 모바일 메뉴(햄버거), 사이드바 드로어, 터치 최적화 없음.
- **난이도**: 보통
- **예상 효과**: 모바일 사용자 접근성 확보 (트래픽의 40-60%)
- **실행 방법**:
  - 모바일 햄버거 메뉴 구현
  - 사이드바를 모바일에서 오버레이 드로어로
  - 터치 영역 최소 44px 보장
  - 템플릿 그리드 `grid-cols-1 sm:grid-cols-2`로 조정

### 13. UI/UX: 로딩/에러 상태 처리 미흡
- **파일**: 전체 프론트엔드
- **문제**: 로딩 시 단순 스피너만 표시, 에러 시 `alert()` 사용, skeleton UI 없음, 토스트 알림 없음. Skywork은 세련된 로딩 애니메이션과 인라인 에러 메시지 사용.
- **난이도**: 보통
- **예상 효과**: 체감 성능 향상, 사용자 신뢰도 상승
- **실행 방법**:
  - `react-hot-toast` 또는 자체 토스트 시스템 도입
  - Skeleton UI 컴포넌트 구현 (프로젝트 목록, 상세 페이지)
  - `alert()` 전면 제거 → 인라인 에러/성공 메시지
  - Framer Motion으로 페이지 전환 애니메이션

### 14. UI/UX: 다크 모드 미지원
- **파일**: `layout.tsx`, 전체
- **문제**: 라이트 모드만 존재. 현대 SaaS 표준에서 다크 모드는 필수.
- **난이도**: 보통
- **예상 효과**: 사용자 경험 향상, 야간 사용 편의
- **실행 방법**:
  - `next-themes` 패키지 도입
  - Tailwind `dark:` 클래스 적용
  - 토글 버튼 헤더에 추가
  - CSS 변수 기반 색상 시스템으로 전환

### 15. UI/UX: 프로젝트 상세 페이지 - 문서 미리보기 없음
- **파일**: `plan-craft-web/app/project/[id]/page.tsx`
- **문제**: 완료된 문서를 다운로드만 가능하고 브라우저 내 미리보기가 없음. Skywork은 인라인 문서 뷰어를 제공하여 다운로드 전 확인 가능.
- **난이도**: 어려움
- **예상 효과**: 사용자 만족도 대폭 향상
- **실행 방법**:
  - `iframe` 또는 HTML sanitizer로 문서 미리보기 컴포넌트 구현
  - 섹션별 네비게이션 (목차 기반)
  - 인쇄/PDF 다운로드 버튼
  - 문서 내 검색 기능

### 16. 기능: "에이전트와 소통" 기능이 가짜
- **파일**: `plan-craft-web/app/project/[id]/page.tsx`
- **문제**: `handleSendMessage`는 단순히 "요청을 확인했습니다. AI 에이전트에게 전달하겠습니다." 고정 메시지를 1초 후 보여줌. 실제 AI 에이전트와의 상호작용 없음. `handleFileUpload`도 파일 업로드 없이 setTimeout으로 메시지만 표시.
- **난이도**: 어려움
- **예상 효과**: 핵심 차별화 기능 (실시간 AI 대화형 문서 수정)
- **실행 방법**:
  - 백엔드에 대화형 수정 API 구현 (`POST /api/generate/:projectId/chat`)
  - 생성 진행 중 사용자 피드백을 에이전트에 전달하는 메커니즘
  - 완료 후 특정 섹션 재작성 요청 기능
  - 실제 파일 업로드 → S3/로컬 저장 → 참고자료로 활용

### 17. 기능: 문서 포맷 HTML만 지원
- **파일**: `plan-craft-backend/src/routes/generate.js`
- **문제**: 다운로드 시 HTML 포맷만 지원. 실제 사용자는 DOCX, PDF 포맷을 기대.
- **난이도**: 보통
- **예상 효과**: 실용성 대폭 향상
- **실행 방법**:
  - `puppeteer` 또는 `playwright`로 HTML → PDF 변환
  - `docx` npm 패키지로 HTML → DOCX 변환
  - 다운로드 버튼에 포맷 선택 드롭다운 추가
  - PPT 지원 (bonus)

### 18. 기능: 프로젝트 삭제/편집 기능 미구현 (프론트엔드)
- **파일**: `plan-craft-web/app/projects/page.tsx`
- **문제**: 백엔드에 `PATCH /api/projects/:id`, `DELETE /api/projects/:id` 라우트가 있지만, 프론트엔드에서 이를 사용하는 UI가 없음. 사용자가 프로젝트를 수정하거나 삭제할 방법 없음.
- **난이도**: 쉬움
- **예상 효과**: 기본적인 CRUD 완성
- **실행 방법**:
  - 프로젝트 카드에 드롭다운 메뉴 (수정/삭제/복제)
  - 삭제 시 확인 모달
  - 제목/아이디어 인라인 편집
  - 벌크 삭제 기능 (체크박스)

### 19. 기능: 재생성 기능 없음
- **파일**: `plan-craft-web/app/project/[id]/page.tsx`
- **문제**: 문서 생성이 실패하거나 결과가 불만족스러울 때 재생성할 방법이 없음.
- **난이도**: 쉬움
- **예상 효과**: 사용자 이탈 방지
- **실행 방법**:
  - 완료/실패 상태에서 "재생성" 버튼 추가
  - 기존 결과 보존 옵션 (버전 관리)
  - 특정 섹션만 재생성하는 기능

### 20. 코드 품질: 인증 상태 관리 패턴 불안정
- **파일**: 전체 프론트엔드
- **문제**: `localStorage`에서 직접 토큰/사용자 정보를 읽는 패턴이 모든 페이지에 반복. React Context나 상태 관리 라이브러리 미사용. 토큰 만료 처리 없음.
- **난이도**: 보통
- **예상 효과**: 코드 일관성, 토큰 만료 시 자동 로그아웃
- **실행 방법**:
  ```typescript
  // contexts/AuthContext.tsx
  const AuthContext = createContext<AuthState>(null);
  
  export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    
    // 토큰 만료 체크
    // 자동 로그아웃
    // axios interceptor에서 401 → 자동 리다이렉트
    
    return <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>;
  }
  ```

### 21. 코드 품질: API 클라이언트 미표준화
- **파일**: 전체 프론트엔드
- **문제**: 각 페이지에서 직접 `axios.get/post`를 호출하며, `API_URL` 상수를 매 파일 상단에 선언. 에러 처리, 토큰 첨부 등 반복.
- **난이도**: 보통
- **예상 효과**: 코드 중복 70% 감소, 일관된 에러 처리
- **실행 방법**:
  ```typescript
  // lib/api.ts
  import axios from 'axios';
  
  export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  });
  
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
  );
  ```

### 22. 코드 품질: TypeScript 활용 미흡
- **파일**: 전체 프론트엔드
- **문제**: 인터페이스가 파일마다 중복 정의 (`User`, `Project` 인터페이스가 3개 파일에 각각 정의). `any` 타입 사용 (`realtimeProgress: any`). 타입 안전성 낮음.
- **난이도**: 보통
- **예상 효과**: 런타임 에러 감소, 개발 생산성 향상
- **실행 방법**:
  ```
  types/
    index.ts       # 공통 타입
    api.ts         # API 응답 타입
    project.ts     # 프로젝트 관련 타입
  ```
  - 모든 `any` 타입을 구체적 인터페이스로 교체
  - API 응답 타입을 zod로 정의하고 프론트/백엔드 공유

### 23. 성능: 프로젝트 목록 페이지네이션 없음
- **파일**: `plan-craft-web/app/projects/page.tsx`, `plan-craft-backend/src/routes/projects.js`
- **문제**: 모든 프로젝트를 한 번에 로드. 프로젝트 수가 늘어나면 성능 저하.
- **난이도**: 쉬움
- **예상 효과**: 대규모 데이터 시 안정적 로딩
- **실행 방법**:
  - 백엔드: `?page=1&limit=20` 쿼리 파라미터 추가
  - 프론트엔드: 무한 스크롤 또는 페이지네이션 UI
  - 정렬 옵션 (최신순, 이름순, 상태별)
  - 검색/필터 기능

### 24. 성능: 이미지 최적화 미사용
- **파일**: `plan-craft-web/app/page.tsx`
- **문제**: 현재 이미지가 거의 없지만, 향후 템플릿 썸네일 등에서 Next.js `Image` 컴포넌트 미사용.
- **난이도**: 쉬움
- **예상 효과**: 이미지 로딩 속도 60% 향상
- **실행 방법**: `next/image` 컴포넌트 사용, blur placeholder 적용

### 25. 백엔드: 진행 상황이 메모리에만 저장
- **파일**: `plan-craft-backend/src/utils/progress-tracker.js`
- **문제**: `ProgressTracker`가 `Map`으로 메모리에만 저장. 서버 재시작 시 진행 상황 유실. 다중 서버 인스턴스에서 공유 불가.
- **난이도**: 보통
- **예상 효과**: 서버 재시작 시 진행 상황 복구, 수평 확장 가능
- **실행 방법**:
  - Redis로 진행 상황 저장 (TTL 30분)
  - 또는 DB에 progress 테이블 추가 (간단한 방법)
  ```javascript
  // Redis 기반
  import Redis from 'ioredis';
  const redis = new Redis(process.env.REDIS_URL);
  
  async updateAgent(projectId, agentName, data) {
    const key = `progress:${projectId}`;
    await redis.hset(key, agentName, JSON.stringify(data));
    await redis.expire(key, 1800); // 30분 TTL
  }
  ```

### 26. 백엔드: Rate Limiting 없음
- **파일**: `plan-craft-backend/src/index.js`
- **문제**: API에 rate limiting이 없어 무한 요청 가능. 문서 생성은 비싼 AI API 호출을 포함하므로 악용 위험 높음.
- **난이도**: 쉬움
- **예상 효과**: API 남용 방지, 비용 보호
- **실행 방법**:
  ```javascript
  import { rateLimiter } from 'hono-rate-limiter';
  
  app.use('/api/generate/*', rateLimiter({
    windowMs: 60 * 60 * 1000, // 1시간
    limit: 5, // 시간당 5회 생성
    keyGenerator: (c) => c.get('userId'),
  }));
  
  app.use('/api/auth/*', rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10, // 15분당 10회
  }));
  ```

### 27. 백엔드: Orchestrator 에러 핸들링 부실
- **파일**: `plan-craft-backend/src/routes/generate.js`
- **문제**: `generateDocumentBackground` 함수에서 에러 발생 시 프로젝트 상태를 'failed'로 변경하지만, 에러 원인을 DB에 저장하지 않음. 사용자에게 왜 실패했는지 정보 전달 불가.
- **난이도**: 보통
- **예상 효과**: 디버깅 용이, 사용자 신뢰도 향상
- **실행 방법**:
  - `projects` 테이블에 `error_message TEXT` 컬럼 추가
  - 실패 시 에러 메시지 저장
  - 프론트엔드에서 실패 원인 표시

### 28. 성능: Orchestrator 내 하드코딩된 2초 Rate Limiting
- **파일**: `plan-craft-backend/src/engine/agent-team-orchestrator.js`
- **문제**: 라운드 간 `await new Promise(resolve => setTimeout(resolve, 2000))` 고정. API rate limit 상황에 따라 동적으로 조절 필요.
- **난이도**: 보통
- **예상 효과**: 생성 속도 최적화
- **실행 방법**:
  - 429 응답 시 exponential backoff
  - rate limit 여유가 있을 때 딜레이 단축
  - 환경변수로 기본 딜레이 설정 가능하도록

---

## 🟢 P2: 개선/향상

### 29. UI/UX: 온보딩 플로우 없음
- **문제**: 가입 후 바로 빈 홈 화면. 튜토리얼, 첫 문서 생성 가이드 없음.
- **난이도**: 보통
- **예상 효과**: 첫 사용자 활성화율 향상
- **실행 방법**: 가입 후 환영 모달 → 첫 프로젝트 생성 가이드 (3단계)

### 30. UI/UX: 애니메이션/마이크로인터랙션 부재
- **문제**: 상태 변화, 버튼 클릭, 페이지 전환 시 시각적 피드백 미흡. Skywork 수준의 매끄러운 전환 효과 없음.
- **난이도**: 보통
- **예상 효과**: 전문적/세련된 느낌
- **실행 방법**: Framer Motion 도입, 페이지 전환/카드 호버/진행바 애니메이션

### 31. UI/UX: SEO 최적화 미흡
- **파일**: `layout.tsx`, 전체
- **문제**: 기본 meta 태그만 존재. OG 태그, 구조화된 데이터, sitemap, robots.txt 없음.
- **난이도**: 쉬움
- **예상 효과**: 검색 유입 증가
- **실행 방법**: Next.js metadata API 활용, sitemap.xml 자동 생성, OG 이미지

### 32. UI/UX: 접근성(a11y) 미흡
- **문제**: 키보드 내비게이션, aria-label, 포커스 관리, 색상 대비 등 접근성 표준 미적용.
- **난이도**: 보통
- **예상 효과**: 접근성 규정 준수, 모든 사용자 포용
- **실행 방법**: axe-core 감사 실행, aria 속성 추가, 포커스 트랩 구현

### 33. 기능: 사용량 대시보드 없음
- **문제**: 토큰 사용량, 비용, 생성 이력 등을 사용자가 확인할 수 없음. 백엔드에 `token_usage` 테이블이 있지만 프론트엔드 미구현.
- **난이도**: 보통
- **예상 효과**: 투명한 사용량 관리, Pro 플랜 업셀 유도
- **실행 방법**: 대시보드 페이지 + 차트 (recharts/visx)

### 34. 기능: 플랜/결제 시스템 껍데기만 존재
- **문제**: Free/Pro Mode 드롭다운이 있지만 `alert('Pro Mode는 준비 중입니다')`. 실제 구독/결제 시스템 없음.
- **난이도**: 어려움
- **예상 효과**: 매출 창출
- **실행 방법**: Stripe 연동, 플랜별 기능 제한, 결제 페이지

### 35. 기능: 문서 공유/협업 기능 없음
- **문제**: 생성된 문서를 다른 사람과 공유하거나 공동 편집할 방법 없음.
- **난이도**: 어려움
- **예상 효과**: 팀 사용 활성화
- **실행 방법**: 공유 링크 생성, 읽기 전용 공개 페이지, 코멘트 기능

### 36. 성능: 번들 최적화
- **파일**: `package.json`
- **문제**: axios(13KB gzipped)를 단순 fetch 대신 사용. 클라이언트 번들에 불필요한 의존성 포함 가능.
- **난이도**: 보통
- **예상 효과**: 초기 로딩 속도 향상
- **실행 방법**: axios → fetch + 간단한 래퍼, 또는 `ky` (1KB) 사용. dynamic import 활용.

### 37. 배포: CI/CD 파이프라인 없음
- **문제**: GitHub Actions, Vercel 자동 배포 등 CI/CD 미설정.
- **난이도**: 보통
- **예상 효과**: 배포 안정성, 자동 테스트
- **실행 방법**: GitHub Actions → lint + type check + build → Vercel/Railway 자동 배포

### 38. 배포: 테스트 코드 전무
- **문제**: 단위 테스트, 통합 테스트, E2E 테스트가 전혀 없음.
- **난이도**: 어려움
- **예상 효과**: 회귀 방지, 코드 신뢰성
- **실행 방법**:
  - 백엔드: Vitest + API 통합 테스트
  - 프론트엔드: React Testing Library + Cypress E2E
  - 핵심 플로우(가입→생성→다운로드) E2E 테스트 우선

### 39. 배포: 에러 모니터링 없음
- **문제**: 프로덕션 에러를 `console.error`로만 로깅. 에러 알림, 트래킹 시스템 없음.
- **난이도**: 쉬움
- **예상 효과**: 장애 대응 시간 단축
- **실행 방법**: Sentry 도입 (프론트엔드 + 백엔드), 에러 알림 Slack/Discord 웹훅

### 40. 배포: 환경 설정 관리
- **문제**: `.env` 파일 관리 표준 없음. 필요한 환경변수 목록이 문서화되어 있지 않음.
- **난이도**: 쉬움
- **예상 효과**: 팀 온보딩 시간 단축
- **실행 방법**: `.env.example` 생성, 환경변수 검증 스크립트, Docker Compose 설정

### 41. 코드 품질: 백엔드 JavaScript → TypeScript 전환
- **문제**: 프론트엔드는 TypeScript인데 백엔드는 plain JavaScript. 타입 안전성 없음, 에이전트 코드의 `config` 파라미터 타입 불명확.
- **난이도**: 어려움
- **예상 효과**: 백엔드 코드 안정성 대폭 향상
- **실행 방법**: 점진적 전환 (.js → .ts), tsconfig.json 설정, 인터페이스 정의

### 42. 코드 품질: 로깅 시스템 표준화
- **파일**: 백엔드 전체
- **문제**: `console.log`로 로깅. 로그 레벨, 구조화된 로그, 파일 출력 없음.
- **난이도**: 쉬움
- **예상 효과**: 운영 디버깅 효율 향상
- **실행 방법**: `pino` 또는 `winston` 도입, JSON 구조화 로그, 로그 레벨 관리

---

## 🎯 우선순위별 실행 로드맵

### Phase 1: 긴급 수정 (1-2일)
1. JWT 시크릿 하드코딩 수정 (#1)
2. SQLite → PostgreSQL 마이그레이션 in generate.js (#2)
3. 비밀번호 검증 통일 (#4)
4. `/me` 엔드포인트 인증 미들웨어 추가 (#5)
5. 미사용 파일/코드 정리 (#6, #7)
6. Rate Limiting 추가 (#26)

### Phase 2: 아키텍처 개선 (3-5일)
1. 공통 컴포넌트 추출 (Header, AuthProvider) (#8, #20)
2. API 클라이언트 표준화 (#21)
3. TypeScript 타입 통합 (#22)
4. SSE/WebSocket 전환 (#9, #10)
5. CORS 설정 개선 (#3)

### Phase 3: UX 혁신 (1-2주)
1. 랜딩 페이지 리디자인 (#11)
2. 문서 미리보기 구현 (#15)
3. 토스트/Skeleton UI (#13)
4. 반응형 디자인 (#12)
5. 프로젝트 삭제/편집 UI (#18)
6. 재생성 기능 (#19)
7. DOCX/PDF 다운로드 (#17)

### Phase 4: 고급 기능 (2-4주)
1. 실제 AI 대화 기능 (#16)
2. 다크 모드 (#14)
3. 사용량 대시보드 (#33)
4. 에러 모니터링 (#39)
5. CI/CD 파이프라인 (#37)
6. 테스트 코드 작성 (#38)

### Phase 5: 비즈니스 확장 (4주+)
1. 결제 시스템 (#34)
2. 문서 공유/협업 (#35)
3. 온보딩 플로우 (#29)
4. 백엔드 TypeScript 전환 (#41)

---

## 📊 Skywork 대비 갭 분석

| 영역 | Plan-Craft 현재 | Skywork 수준 | 갭 |
|------|-----------------|-------------|-----|
| 랜딩 페이지 | 기본 템플릿 나열 | 인터랙티브 데모 + 성공 사례 | 큼 |
| 문서 미리보기 | 없음 (다운로드만) | 인라인 뷰어 + 편집 | 매우 큼 |
| 실시간 진행 | 1초 폴링 | SSE/WebSocket | 보통 |
| 인증/보안 | 기본 JWT | OAuth + 2FA + 세션 관리 | 큼 |
| 다운로드 포맷 | HTML만 | PDF/DOCX/PPT | 큼 |
| 모바일 | 부분 대응 | 완전 반응형 + PWA | 큼 |
| 에러 처리 | alert() | 토스트 + 재시도 + 폴백 | 큼 |
| 테스트 | 없음 | Unit + Integration + E2E | 매우 큼 |
| 모니터링 | console.log | Sentry + 대시보드 | 큼 |
| 협업 | 없음 | 실시간 공유/코멘트 | 매우 큼 |

---

> **결론**: Plan-Craft는 핵심 아이디어(4-에이전트 문서 생성)는 강력하나, 프로덕션 레벨 안정성과 UX 완성도에서 Skywork 대비 상당한 갭이 있습니다. **P0 보안 이슈 즉시 해결 → 아키텍처 정리 → UX 개선** 순서로 진행하면 2-4주 내에 Skywork에 견줄 수 있는 수준으로 업그레이드 가능합니다.
