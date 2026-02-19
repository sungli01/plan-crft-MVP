# 프론트엔드 가이드

> `plan-craft-frontend-v2/` — Vite + React 18 + shadcn/ui + TypeScript

`plan-craft-frontend/` (Next.js 구버전)은 더 이상 사용하지 않습니다.

## 기술 스택

- **빌드**: Vite 5
- **UI**: React 18, shadcn/ui (Radix UI 기반), Tailwind CSS 4
- **상태관리**: Zustand, TanStack React Query
- **라우팅**: React Router 6
- **폼**: React Hook Form + Zod
- **HTTP**: Axios
- **애니메이션**: Framer Motion
- **아이콘**: Lucide React, Iconify

## 디렉토리 구조

```
plan-craft-frontend-v2/
├── src/
│   ├── main.tsx              # 앱 엔트리포인트
│   ├── App.tsx               # 라우팅 설정
│   ├── index.css             # 전역 스타일 (Tailwind)
│   ├── vite-env.d.ts
│   ├── lib/
│   │   ├── index.ts          # 라우트 상수, 타입, 카테고리 정의, 유틸
│   │   ├── utils.ts          # cn() 등 유틸
│   │   ├── motion.ts         # Framer Motion 유틸
│   │   ├── generation-persist.ts  # 생성 상태 로컬 저장
│   │   └── react-router-dom-proxy.tsx # 라우터 프록시
│   ├── pages/
│   │   ├── Home.tsx           # 랜딩 페이지 (비로그인)
│   │   ├── Login.tsx          # 로그인
│   │   ├── Register.tsx       # 회원가입
│   │   ├── Dashboard.tsx      # 대시보드 (프로젝트 목록)
│   │   ├── Categories.tsx     # 문서 카테고리 선택
│   │   ├── Generate.tsx       # 프로젝트 생성 + 생성 진행/결과
│   │   ├── Profile.tsx        # 프로필
│   │   ├── Admin.tsx          # 관리자 패널
│   │   ├── home/
│   │   │   ├── Index.tsx
│   │   │   └── components/Demo.tsx
│   │   └── not-found/Index.tsx
│   ├── hooks/
│   │   ├── useAuth.ts         # 인증 훅 (AuthProvider, 로그인/로그아웃)
│   │   ├── useProjects.ts     # 프로젝트 CRUD 훅
│   │   ├── useGenerate.ts     # 문서 생성 훅
│   │   ├── use-toast.ts       # Toast 알림
│   │   └── use-mobile.tsx     # 모바일 감지
│   ├── components/
│   │   ├── Layout.tsx         # 앱 레이아웃 (사이드바, 헤더)
│   │   ├── Forms.tsx          # 폼 컴포넌트
│   │   └── ui/               # shadcn/ui 컴포넌트 (30+ 개)
│   │       ├── button.tsx, card.tsx, dialog.tsx, ...
│   │       └── toaster.tsx, sonner.tsx, ...
│   └── assets/
│       └── images.ts          # 이미지 경로 상수
├── public/                    # 정적 파일
├── package.json
├── vite.config.ts             # Vite 설정 (alias, CDN 이미지 플러그인)
├── tsconfig.json
├── components.json            # shadcn/ui 설정
└── .env.example
```

## 라우팅

`src/App.tsx`에서 React Router 6으로 정의:

| 경로 | 페이지 | 레이아웃 | 설명 |
|------|--------|---------|------|
| `/` | Home / Dashboard | 조건부 | 비로그인→랜딩, 로그인→대시보드 |
| `/login` | Login | 없음 | 로그인 |
| `/register` | Register | 없음 | 회원가입 |
| `/dashboard` | Dashboard | Layout | 프로젝트 목록 |
| `/categories` | Categories | Layout | 카테고리 선택 |
| `/generate` | Generate | Layout | 프로젝트 생성/진행 |
| `/generate/:categoryId` | Generate | Layout | 카테고리별 생성 |
| `/profile` | Profile | Layout | 프로필 |
| `/admin` | Admin | Layout | 관리자 패널 |

라우트 경로 상수는 `src/lib/index.ts`의 `ROUTE_PATHS`에 정의.

## 상태관리

- **TanStack Query**: 서버 데이터 (프로젝트 목록, 생성 상태 등) 캐싱 및 폴링
  - `staleTime`: 5분
  - `retry`: 1회
- **Zustand**: 클라이언트 상태 (필요 시)
- **localStorage**: 토큰 저장 (`plan_craft_token`)

## API 연동

`useAuth.ts`, `useProjects.ts`, `useGenerate.ts` 등 커스텀 훅에서 Axios로 API 호출.

백엔드 URL: 환경변수 `VITE_API_URL`로 설정.

```typescript
// 예: axios 인스턴스
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

## 문서 카테고리

`src/lib/index.ts`의 `DOCUMENT_CATEGORIES`:

| ID | 이름 | PRO 전용 |
|----|------|---------|
| business-plan | 사업계획서 | ❌ |
| marketing | 마케팅 | ❌ |
| tech-doc | 기술문서 | ❌ |
| dev-plan | 개발계획 | ❌ |
| investment | 투자유치 | ✅ |
| research-report | 연구보고서 | ✅ |
| national-project | 국가사업 | ❌ |

## 환경변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_API_URL` | 백엔드 API URL | `https://plan-crft-mvp-production.up.railway.app` |
| `VITE_ENABLE_ROUTE_MESSAGING` | 라우트 메시징 활성화 | `true` |

## 빌드 및 배포

```bash
# 개발
npm run dev          # http://localhost:8080

# 프로덕션 빌드
npm run build        # dist/ 폴더 생성

# 미리보기
npm run preview
```

Vite 설정 특이사항:
- `@` 별칭 → `./src`
- `react-router-dom` → 커스텀 프록시로 래핑
- CDN 이미지 접두사 플러그인 (빌드 시 `/images/` 경로를 CDN URL로 변환)
- Lovable Tagger 플러그인 (개발 모드)
