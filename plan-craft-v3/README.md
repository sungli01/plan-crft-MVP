# Plan-Craft v3.0

**AI 멀티 에이전트 기반 고품질 사업계획서 자동 생성 시스템**

---

## ✨ 주요 특징

### 1. 멀티 에이전트 시스템

4개의 전문 AI 에이전트가 협력하여 문서를 생성합니다:

```
📐 Architect  → ✍️  Writer → 🖼️  Image Curator → ✅ Reviewer
  (설계자)        (작성자)      (이미지 큐레이터)   (검수자)
```

- **Architect**: 문서 구조 설계, 섹션 분할, 이미지 영역 식별
- **Writer**: 섹션별 내용 작성, 계층 구조 적용, 개조식 표현
- **Image Curator**: 이미지 검색/생성, 배치 최적화
- **Reviewer**: 품질 검증, 개선 제안, 재작성 판단

### 2. 고품질 문서 생성

#### 계층 구조
```
## 중제목
### 소제목
1. **첫 번째 항목**
   - 세부 사항 1
   - 세부 사항 2
```

#### 개조식 표현
- 번호 매기기 (순서가 있는 내용)
- 불릿 포인트 (병렬적 나열)
- 계층적 혼용

#### 품질 검증
- 자동 점수 계산 (0-100점)
- 구조, 개조식, 내용, 강조 4개 영역 평가
- 개선 제안 자동 생성

### 3. 이미지 통합 (진행 중)

- **RAG 검색**: 관련 이미지 자동 검색
- **AI 생성**: DALL-E 3 기반 이미지 생성
- **최적 배치**: 맥락에 맞는 위치 결정

### 4. 토큰 추적

- 에이전트별 토큰 사용량 추적
- 실시간 비용 계산
- 모델별 비용 분석

---

## 🚀 빠른 시작

### 설치

```bash
npm install
```

### 환경 변수 설정

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### 실행

#### 단일 에이전트 (테스트용)
```bash
npm run generate
```

#### 멀티 에이전트 (프로덕션)
```bash
npm run multi
```

#### 커스텀 프로젝트
```bash
node generate-multi-agent.js "프로젝트명" "핵심 아이디어"
```

---

## 📊 성능

### v2.0 vs v3.0 비교

| 항목 | v2.0 (Haiku) | v3.0 (Multi-Agent) |
|------|--------------|---------------------|
| 구조 | 문자열 나열 | 명확한 계층 |
| 형식 | 일반 문장 | 개조식 표현 |
| 품질 점수 | 60-70점 | 85-95점 |
| 이미지 | 없음 | 통합 지원 |
| 검증 | 없음 | 자동 검증 |
| 비용 | $0.10-0.20 | $0.50-1.00 |

### 생성 시간

- 3개 섹션: ~2분
- 10개 섹션: ~7분
- 40개 섹션: ~30분

---

## 🏗️ 아키텍처

```
Orchestrator
    ├── Architect Agent (Claude Opus 4)
    ├── Writer Agent (Claude Opus 4)
    ├── Image Curator Agent (Claude Sonnet 4)
    └── Reviewer Agent (Claude Sonnet 4)
```

### 워크플로우

```
1. Architect: 문서 구조 설계
   ↓
2. Writer: 병렬 섹션 작성
   ↓
3. Image Curator: 이미지 통합
   ↓
4. Reviewer: 품질 검증
   ↓
5. 최종 HTML/PDF 생성
```

---

## 📁 프로젝트 구조

```
plan-craft-v3/
├── agents/
│   ├── architect.js       # 설계자 에이전트
│   ├── writer.js          # 작성자 에이전트
│   ├── image-curator.js   # 이미지 큐레이터
│   └── reviewer.js        # 검수자 에이전트
├── orchestrator.js        # 오케스트레이터
├── generate.js            # 단일 에이전트 생성
├── generate-multi-agent.js # 멀티 에이전트 생성
├── ARCHITECTURE.md        # 전체 아키텍처 문서
├── package.json
└── README.md
```

---

## 🎯 로드맵

### Phase 1: 핵심 엔진 (완료)
- [x] 멀티 에이전트 시스템
- [x] 계층 구조 + 개조식
- [x] 품질 검증 시스템
- [ ] 이미지 통합 (진행 중)

### Phase 2: 백엔드 API (예정)
- [ ] Hono 기반 REST API
- [ ] 인증/인가 시스템
- [ ] WebSocket 실시간 진행률
- [ ] 토큰 추적 API

### Phase 3: 프론트엔드 (예정)
- [ ] Next.js 14 대시보드
- [ ] 프로젝트 관리 UI
- [ ] 실시간 진행률 표시
- [ ] 토큰 사용량 차트

### Phase 4: 배포 (예정)
- [ ] Vercel 배포
- [ ] Railway 백엔드
- [ ] 모니터링 시스템

---

## 💰 비용

### 토큰당 비용 (USD)

| 모델 | Input (1M tokens) | Output (1M tokens) |
|------|-------------------|---------------------|
| Claude Opus 4 | $15 | $75 |
| Claude Sonnet 4 | $3 | $15 |
| GPT-4 Turbo | $10 | $30 |

### 예상 비용

- 3개 섹션: $0.05-0.10
- 10개 섹션: $0.15-0.30
- 40개 섹션: $0.50-1.00
- 120개 섹션: $1.50-3.00

---

## 🔧 설정

### 모델 선택

`generate-multi-agent.js`에서 모델을 변경할 수 있습니다:

```javascript
const config = {
  architectModel: 'claude-opus-4-20250514',
  writerModel: 'claude-opus-4-20250514',
  curatorModel: 'claude-sonnet-4-20250514',
  reviewerModel: 'claude-sonnet-4-20250514'
};
```

### 품질 vs 비용

#### 최고 품질 (권장)
```javascript
writerModel: 'claude-opus-4-20250514'  // 품질 90+ 보장
```

#### 균형형
```javascript
writerModel: 'claude-sonnet-4-20250514'  // 품질 80-85, 비용 1/5
```

---

## 📄 라이선스

MIT

---

## 🤝 기여

이슈나 풀 리퀘스트를 환영합니다!

---

## 📞 문의

프로젝트 관련 문의는 이슈를 남겨주세요.

---

**Plan-Craft v3.0** - AI가 만드는 완벽한 사업계획서 ✨
