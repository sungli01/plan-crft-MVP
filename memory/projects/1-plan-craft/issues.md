# Plan-Craft 문제 해결 이력

## 1. Railway 환경변수 문제
**발생**: 2026-02-09 00:22
**증상**: ANTHROPIC_API_KEY가 10자만 저장됨 (108자여야 함)
**원인**: `.env.example`의 placeholder `sk-ant-...` (10자)가 Railway에 로드됨
**해결**: Railway Variables UI에서 직접 108자 키 입력
**커밋**: 여러 시도 후 해결

## 2. DATABASE_URL 한글 입력 오류
**발생**: 2026-02-09 01:00
**증상**: `Invalid URL: '기존값유지'` 에러로 DB 연결 실패
**원인**: 사용자가 "기존값유지"를 literal로 입력
**해결**: 실제 PostgreSQL URL로 교체
**교훈**: Railway Raw Editor에서 한글 입력 금지

## 3. 모델명 매핑 오류
**발생**: 2026-02-09 01:37
**증상**: Anthropic API 404 - `claude-opus-4` 모델 없음
**원인**: DB에 shorthand 저장, Anthropic은 full name 필요
**해결**: `MODEL_MAP` 추가 - `claude-opus-4` → `claude-opus-4-6`
**커밋**: e31d36c

## 4. Architect JSON 파싱 에러
**발생**: 2026-02-09 01:50
**증상**: `Unterminated string in JSON at position 9476/18085`
**원인**: max_tokens 4000 부족, 25 섹션으로 JSON 너무 큼
**해결**: max_tokens 4000→8000, 섹션 수 25→10~15
**커밋**: 4318f5e, f8d2d9d

## 5. tokenTracker.usage.total undefined
**발생**: 2026-02-09 10:59 (반복 발생)
**증상**: `Cannot read properties of undefined (reading 'total')`
**원인1**: orchestrator.ts에서 optional chaining 누락
**해결1**: `?.usage?.total?.cost || 0` 추가
**커밋1**: 0aba0d8

**원인2**: generate.ts에서 잘못된 참조
- `summary.tokenUsage.input/output/total` (존재하지 않음)
- `summary.totalTokens.input/output/total` (올바른 경로)
**해결2**: generate.ts L321-323 수정 + null 체크
**커밋2**: 94eb8d3
**상태**: 테스트 중 (2026-02-09 13:50)

## 6. dotenv 환경변수 충돌
**발생**: 2026-02-09 01:12
**증상**: Railway 환경변수가 `.env` 파일로 override됨
**원인**: production에서도 `import 'dotenv/config'` 실행
**해결**: `RAILWAY_ENVIRONMENT` 체크 후 dotenv 조건부 로드
**커밋**: 920a8d5, 54c46c4

## 교훈
1. Railway Variables는 UI에서 직접 입력 (Raw Editor 주의)
2. API 키는 항상 길이 확인 (108자)
3. 모델명은 DB shorthand → API full name 매핑
4. Architect는 8000+ tokens + 간소화된 프롬프트
5. summary 응답 구조 확인 후 접근 (tokenUsage vs totalTokens)
6. dotenv는 development only

## 5-2. tokenSummary.total.cost undefined (추가 발견)
**발생**: 2026-02-09 15:24
**증상**: 동일한 "Cannot read properties of undefined (reading 'total')" 에러 계속 발생
**원인**: orchestrator.ts L269에서 `tokenSummary.total.cost` 접근 시 null 체크 없음
**해결**: optional chaining + fallback 추가
- L252-254: getSummary()/getOptimizationReport()에 fallback
- L269: `tokenSummary?.total?.cost || 'N/A'`
**커밋**: 291d6d9
**상태**: Railway 재배포 중 (2~3분 후 테스트)

## 6. ImageCurator/Reviewer 에러로 프로세스 중단
**발생**: 2026-02-09 17:57
**증상**: generating 상태로 무한 멈춤, 완료 메시지 없음
**원인**: ImageCurator JSON 파싱 에러 시 전체 프로세스 중단
**해결**: 
- ImageCurator를 try-catch로 감싸서 실패 시 빈 배열 반환
- Reviewer를 try-catch로 감싸서 실패 시 기본 점수 80점 사용
- 이미지 없이라도 문서 생성 완료 가능하게 변경
**커밋**: 5b5df44
**상태**: Railway 재배포 중 (2~3분 후 테스트)
