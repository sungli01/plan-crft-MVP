
## 프로젝트 번호 체계 (2026-02-09)

### 1번 업무: Plan-Craft v5.0
- AI 멀티에이전트 사업계획서 생성 서비스
- Private 서비스 (Admin 승인제)
- 현재 상태: 문서 생성 동작 검증 중
- 배포: Railway + Vercel
- GitHub: https://github.com/sungli01/plan-crft-MVP.git
- 프론트: https://plan-crft-mvp-ot41.vercel.app
- **상세 문서**: `memory/projects/1-plan-craft/` (config, issues, timeline)

### 2번 업무: Travelagent (Skywork Voyage Intelligence)
- Claude 3 Opus 기반 지능형 여행 일정 자동화 서비스
- Frontend: Next.js 14 (Vercel 배포 진행 중)
- Backend: Express + Anthropic SDK (Railway 배포 완료)
- 도메인: travelagent.co.kr (연동 예정)
- GitHub: https://github.com/sungli01/Traver_AI
- 현재 상태: Vercel 재배포 중
- **상세 문서**: `memory/projects/2-travelagent/` (config, issues)

### 추가 프로젝트
- (형님 지시 대기 중)

---

## 지식베이스 구조
프로젝트별로 구조화된 정보를 `memory/projects/` 아래 저장:
- **config.md**: 환경변수, URL, 계정 정보
- **issues.md**: 발생한 문제와 해결 방법 (원인-증상-해결-교훈)
- **timeline.md**: 시간순 개발 이력

검색 방법: `memory_search("프로젝트명 키워드")` 사용

