# Plan-Craft v5.0 개발 타임라인

## Phase 1: v3.0 MVP (이전 작업)
- 4-agent 시스템 구축
- 87.6/100 품질 달성
- Railway + Vercel 배포

## Phase 2: v4.0 Upgrade (이전 작업)
- Sprint 1-6 완료 (TypeScript, Redis, OAuth, Pro tier, Deep research, Mockup, i18n, SEO)
- 토큰 최적화: $0.52 → $0.20

## Phase 3: v5.0 Private Service (2026-02-09)
### 00:14 - Railway 환경변수 디버깅 시작
- ANTHROPIC_API_KEY 10자 문제 발견
- DATABASE_URL, FRONTEND_URL 한글 입력 오류
- CORS crash 해결

### 01:12 - 서버 복구
- 모든 환경변수 정상화
- dotenv production 비활성화

### 01:37 - 모델명 매핑 추가
- `claude-opus-4` → `claude-opus-4-6`

### 01:50 - Architect JSON 파싱 수정
- max_tokens 8000, 섹션 10~15

### 02:01 - 토큰 소진 방지
- 사용자 요청으로 API 키 disable
- Free tier 10→50회 증가

### 10:12 - 재개
- API 키 복구 (107자 → 108자)
- tokenTracker null 체크 추가 (0aba0d8)

### 10:29 - 첫 테스트 (실패)
- 22분 generating 후 실패
- tokenUsage.total undefined 에러

### 13:00 - 토큰 최적화 지시
- Sonnet 전환으로 토큰 절약
- Polling 최소화

### 13:41 - 근본 원인 수정
- summary.tokenUsage → summary.totalTokens
- generate.ts 수정 (94eb8d3)

### 13:50 - 재테스트 진행 중
- 새 프로젝트 생성 후 5~8분 대기
- 최종 검증 예정

## 다음 단계
1. 문서 생성 완료 검증
2. PDF 다운로드 테스트
3. 사용자 관점 전체 흐름 테스트
4. 개선사항 리스트업 및 수정

### 17:39 - 모델 전략 최적화
- Architect: Sonnet → Opus 4.6 (문서 설계 품질 향상)
- Writer: Free는 모두 Sonnet, Pro는 core만 Opus
- 비용 최적화: 핵심만 Opus, 나머지 Sonnet/Haiku
- 커밋: b2e649f
