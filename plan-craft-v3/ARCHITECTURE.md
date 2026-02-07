# Plan-Craft v3.0 시스템 아키텍처

## 📋 목표

**세계 최고 수준의 AI 기반 사업계획서 자동 생성 서비스**

---

## 🎯 핵심 요구사항

### 1. 문서 품질
- ✅ 계층 구조 (대/중/소제목 + 본문)
- ✅ 개조식 표현 (순차적, 논리적)
- ✅ 이미지 통합 (RAG 검색 + AI 생성)
- ✅ 품질 점수 자동 검증

### 2. AI 시스템
- ✅ Claude Opus 4 기본 모델
- ✅ 멀티 에이전트 팀 (역할별 분담)
- ✅ 사용자 모델 선택 가능
- ✅ 실시간 토큰 추적

### 3. 웹 서비스
- ✅ 회원가입/로그인
- ✅ 프로젝트 관리
- ✅ 실시간 생성 진행률
- ✅ HTML/PDF 다운로드

---

## 🏛️ 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  - 사용자 인터페이스                                      │
│  - 프로젝트 입력/관리                                     │
│  - 실시간 진행률 표시                                     │
│  - 토큰 사용량 대시보드                                   │
└──────────────────┬──────────────────────────────────────┘
                   │ REST API / WebSocket
┌──────────────────┴──────────────────────────────────────┐
│                  Backend (Node.js + Hono)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Orchestrator (오케스트레이터)               │ │
│  │  - 작업 스케줄링                                    │ │
│  │  - 에이전트 조율                                    │ │
│  │  - 진행 상황 관리                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │      Multi-Agent System (팀 구성)       │            │
│  ├─────────────────────────────────────────┤            │
│  │ 1. 📐 Architect (설계자)                │            │
│  │    - 문서 구조 설계                     │            │
│  │    - 섹션 분할 및 우선순위              │            │
│  ├─────────────────────────────────────────┤            │
│  │ 2. ✍️ Writer (작성자)                   │            │
│  │    - 섹션별 내용 생성                   │            │
│  │    - 개조식 형식 준수                   │            │
│  ├─────────────────────────────────────────┤            │
│  │ 3. 🖼️ Image Curator (이미지 큐레이터)   │            │
│  │    - RAG 이미지 검색                    │            │
│  │    - 이미지 생성 결정                   │            │
│  │    - 이미지 배치 최적화                 │            │
│  ├─────────────────────────────────────────┤            │
│  │ 4. ✅ Reviewer (검수자)                 │            │
│  │    - 품질 검증                          │            │
│  │    - 일관성 체크                        │            │
│  │    - 개선 제안                          │            │
│  └─────────────────────────────────────────┘            │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │         AI Services (AI 서비스)         │            │
│  ├─────────────────────────────────────────┤            │
│  │ • Anthropic API (Claude Opus 4/Sonnet) │            │
│  │ • OpenAI API (GPT-4, DALL-E 3)         │            │
│  │ • Google Gemini (선택 사항)             │            │
│  └─────────────────────────────────────────┘            │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │      Image System (이미지 시스템)       │            │
│  ├─────────────────────────────────────────┤            │
│  │ • Vector DB (이미지 임베딩)             │            │
│  │ • RAG Search Engine                     │            │
│  │ • Unsplash/Pexels API                   │            │
│  │ • DALL-E 3 / Midjourney API             │            │
│  └─────────────────────────────────────────┘            │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │    Token Tracker (토큰 추적 시스템)     │            │
│  ├─────────────────────────────────────────┤            │
│  │ • 실시간 토큰 카운팅                    │            │
│  │ • 사용자별 사용량 집계                  │            │
│  │ • 비용 계산                             │            │
│  └─────────────────────────────────────────┘            │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────┐
│                   Data Layer (데이터)                    │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────┐ │
│  │  PostgreSQL    │  │     Redis      │  │  Vector   │ │
│  │  - 사용자      │  │  - 세션        │  │  DB       │ │
│  │  - 프로젝트    │  │  - 캐시        │  │  (Qdrant) │ │
│  │  - 토큰 사용   │  │  - 작업 큐     │  │           │ │
│  └────────────────┘  └────────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 문서 생성 워크플로우

```
사용자 입력
    ↓
┌───────────────────────────────────────┐
│ 1️⃣ Architect: 문서 설계               │
│   - 섹션 구조 설계                    │
│   - 이미지 필요 영역 식별             │
│   - 작업 분할                         │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ 2️⃣ Writer: 병렬 섹션 생성             │
│   - 섹션별 내용 작성 (병렬)          │
│   - 계층 구조 적용                    │
│   - 개조식 표현 사용                  │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ 3️⃣ Image Curator: 이미지 통합         │
│   - RAG 검색 (관련 이미지)           │
│   - 생성 필요 판단                    │
│   - DALL-E 3 호출                    │
│   - 이미지 배치                       │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ 4️⃣ Reviewer: 품질 검증                │
│   - 구조 검증                         │
│   - 논리성 검증                       │
│   - 개선 제안                         │
│   - 재작성 필요 시 Writer에게 전달   │
└───────────────┬───────────────────────┘
                ↓
        최종 문서 생성
        (HTML + PDF)
```

---

## 💾 데이터베이스 스키마

### Users (사용자)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Projects (프로젝트)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  idea TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  model VARCHAR(100) DEFAULT 'claude-opus-4',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Documents (생성된 문서)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  content_html TEXT,
  content_pdf_url TEXT,
  quality_score DECIMAL(5,2),
  generated_at TIMESTAMP DEFAULT NOW()
);
```

### TokenUsage (토큰 사용량)
```sql
CREATE TABLE token_usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  model VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_usage_user ON token_usage(user_id, created_at);
```

---

## 🚀 개발 단계

### Phase 1: 핵심 엔진 (완료 중)
- [x] 문서 생성 엔진 v3.0
- [x] 품질 검증 시스템
- [ ] 멀티 에이전트 시스템
- [ ] 이미지 통합 시스템

### Phase 2: 백엔드 API
- [ ] Hono 기반 REST API
- [ ] 인증/인가 (JWT)
- [ ] 프로젝트 CRUD
- [ ] WebSocket (실시간 진행률)
- [ ] 토큰 추적 시스템

### Phase 3: 프론트엔드
- [ ] Next.js 14 App Router
- [ ] 회원가입/로그인 UI
- [ ] 프로젝트 대시보드
- [ ] 문서 생성 UI
- [ ] 실시간 진행률 표시
- [ ] 토큰 사용량 차트

### Phase 4: 배포 및 운영
- [ ] Vercel (Frontend)
- [ ] Railway (Backend)
- [ ] Supabase (PostgreSQL)
- [ ] Redis Cloud
- [ ] Qdrant Cloud (Vector DB)

---

## 🔧 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **API Client**: TanStack Query

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Hono
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Vector DB**: Qdrant
- **ORM**: Drizzle ORM

### AI/ML
- **Primary**: Anthropic Claude API
- **Secondary**: OpenAI API
- **Image Search**: Unsplash, Pexels
- **Image Generation**: DALL-E 3

### DevOps
- **Hosting**: Vercel, Railway
- **Database**: Supabase
- **Monitoring**: Sentry
- **Analytics**: PostHog

---

## 📊 토큰 추적 시스템

### 실시간 추적
```typescript
interface TokenUsage {
  userId: string;
  projectId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  timestamp: Date;
}

// 토큰당 비용 (USD)
const TOKEN_COSTS = {
  'claude-opus-4': {
    input: 0.000015,   // $15 per 1M tokens
    output: 0.000075   // $75 per 1M tokens
  },
  'claude-sonnet-4': {
    input: 0.000003,   // $3 per 1M tokens
    output: 0.000015   // $15 per 1M tokens
  },
  'gpt-4-turbo': {
    input: 0.00001,
    output: 0.00003
  }
};
```

### 대시보드 표시
- 금일 사용량
- 주간/월간 사용량
- 프로젝트별 사용량
- 모델별 사용량
- 총 비용

---

## 🖼️ 이미지 통합 시스템

### RAG 이미지 검색
1. **섹션 키워드 추출**
   - AI가 섹션 내용에서 핵심 키워드 추출
   
2. **Vector DB 검색**
   - 키워드로 이미지 임베딩 검색
   - Unsplash/Pexels에서 관련 이미지 가져오기
   
3. **적합도 평가**
   - AI가 이미지와 내용의 적합도 평가
   - 점수 기반 이미지 선택

### 이미지 생성
1. **생성 필요성 판단**
   - 도식도, 순서도, 그래프 등
   - 검색된 이미지가 부적합한 경우
   
2. **프롬프트 생성**
   - 섹션 내용 기반 상세 프롬프트 작성
   
3. **DALL-E 3 호출**
   - 이미지 생성
   - 품질 검증

### 이미지 배치
```typescript
interface ImagePlacement {
  sectionId: string;
  imageUrl: string;
  caption: string;
  position: 'top' | 'middle' | 'bottom';
  width: 'small' | 'medium' | 'large' | 'full';
}
```

---

## 🔐 보안

- **인증**: JWT (Access + Refresh Token)
- **비밀번호**: bcrypt 해싱
- **API Key**: 환경 변수로 관리
- **Rate Limiting**: IP 기반 제한
- **CORS**: 허용 도메인 화이트리스트

---

## 📈 모니터링

- **오류 추적**: Sentry
- **성능 모니터링**: Vercel Analytics
- **사용자 행동**: PostHog
- **로그**: Winston (구조화된 로그)

---

## 💰 비용 최적화

1. **캐싱 전략**
   - Redis 캐싱으로 중복 API 호출 방지
   
2. **모델 선택**
   - 간단한 작업: Sonnet (저렴)
   - 복잡한 작업: Opus (고품질)
   
3. **배치 처리**
   - 여러 섹션을 한 번의 API 호출로 처리 (가능한 경우)

---

## 🎯 성능 목표

- **문서 생성 속도**: 200페이지 < 30분
- **API 응답 시간**: < 200ms
- **페이지 로딩**: < 2초
- **이미지 검색**: < 5초
- **품질 점수**: 평균 90점 이상

---

작성일: 2026-02-07
버전: 3.0.0
