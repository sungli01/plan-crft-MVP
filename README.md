# Plan-Craft v3.0

AI 멀티에이전트 사업계획서 자동 생성 서비스

![version](https://img.shields.io/badge/version-3.0.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)

## 개요

Plan-Craft는 4개의 AI 에이전트(Researcher → Architect → Writer → ImageCurator)가 협업하여 고품질 사업계획서를 자동 생성하는 웹 서비스입니다.

- 📊 사업계획서, 마케팅, 기술문서, 투자유치 등 7개 카테고리
- 🤖 Claude Opus 4 / Sonnet 4 기반 멀티에이전트 파이프라인
- 🖼️ Unsplash, Brave, DALL-E 이미지 자동 큐레이션
- 📡 WebSocket 실시간 생성 진행상황
- 🔐 JWT 인증 + 관리자 승인제

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Vite, React 18, TypeScript, shadcn/ui, Tailwind CSS 4, TanStack Query, Zustand |
| 백엔드 | Node.js 24, Hono, Drizzle ORM, PostgreSQL, WebSocket |
| AI | Anthropic Claude Opus 4 / Sonnet 4, OpenAI DALL-E |
| 배포 | Vercel (프론트엔드), Railway (백엔드 + DB) |

## 프로젝트 구조

```
plan-crft-MVP/
├── plan-craft-backend/        # Hono + PostgreSQL 백엔드 API
├── plan-craft-frontend-v2/    # Vite + React + shadcn/ui (현재 사용)
├── plan-craft-frontend/       # 구버전 Next.js (미사용)
├── docs/                      # 개발 문서
│   ├── ARCHITECTURE.md        # 시스템 아키텍처
│   ├── API-REFERENCE.md       # API 엔드포인트 전체 레퍼런스
│   ├── BACKEND-GUIDE.md       # 백엔드 구조, DB 스키마, 환경변수
│   ├── FRONTEND-GUIDE.md      # 프론트엔드 구조, 라우팅, 컴포넌트
│   ├── DEPLOYMENT.md          # 배포 가이드 (Vercel + Railway)
│   └── DEVELOPMENT.md         # 로컬 개발 환경 설정
└── reports/                   # 프로젝트 기록, 분석 보고서
```

## 빠른 시작

### 필요 사항
- Node.js 18+
- PostgreSQL 15+
- Anthropic API Key

### 백엔드

```bash
cd plan-craft-backend
npm install
cp .env.example .env
# .env 파일에 DATABASE_URL, ANTHROPIC_API_KEY 등 설정
npm run dev
```

### 프론트엔드

```bash
cd plan-craft-frontend-v2
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
# http://localhost:8080 접속
```

자세한 설정은 [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)를 참조하세요.

## 배포 현황

| 구성요소 | URL |
|---------|-----|
| 프론트엔드 | https://plan-craft-frontend-v2.vercel.app |
| 백엔드 API | https://plan-crft-mvp-production.up.railway.app |
| GitHub | https://github.com/sungli01/plan-crft-MVP |

## 문서

- [아키텍처](./docs/ARCHITECTURE.md) — 시스템 구조, 멀티에이전트 파이프라인, 보안
- [API 레퍼런스](./docs/API-REFERENCE.md) — 모든 API 엔드포인트 상세
- [백엔드 가이드](./docs/BACKEND-GUIDE.md) — DB 스키마, 환경변수, AI 엔진
- [프론트엔드 가이드](./docs/FRONTEND-GUIDE.md) — 컴포넌트, 라우팅, 상태관리
- [배포 가이드](./docs/DEPLOYMENT.md) — Vercel + Railway 배포 절차
- [개발 가이드](./docs/DEVELOPMENT.md) — 로컬 환경 설정, 테스트, API 키

## 라이선스

MIT
