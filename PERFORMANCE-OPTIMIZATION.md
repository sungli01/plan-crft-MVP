# 대화 속도 최적화 전략

**날짜**: 2026-02-10 15:38 GMT+9  
**문제**: 대화가 길어지면서 응답 속도 저하  
**원인**: 컨텍스트 누적 (현재 50K/200K 토큰 사용)

---

## 📊 현재 상태 분석

### 토큰 사용 추이
- 초기: ~5K tokens
- 중간 (1시간 후): ~25K tokens  
- 현재 (2시간 후): **50K tokens** ← 25% 사용
- 예상 (3시간 후): ~75K tokens
- 한계: 200K tokens

### 속도 저하 원인
1. **대화 히스토리 누적**: 모든 이전 대화가 매번 전송
2. **문서 생성**: HANDOVER.md, GITHUB-SETUP.md 등 추가
3. **코드 수정 이력**: Git 커밋, 파일 읽기/쓰기 반복
4. **검색 비효율**: 전체 파일 스캔 방식

---

## 🎯 최적화 전략 (3단계)

### Phase 1: 즉시 적용 (오늘)

#### 1.1 경량 인덱스 (✅ 완료)
```json
memory/index.json - 1.6KB
- 프로젝트 메타데이터
- 빠른 상태 확인
- URL/문서 경로 직접 접근
```

**사용 방법:**
```javascript
// 기존: memory_search + file read (느림)
memory_search("plan-craft url")  // ~500ms
read("memory/projects/1-plan-craft/config.md")  // ~200ms

// 최적화: index 직접 읽기 (빠름)
read("memory/index.json")  // ~50ms
```

#### 1.2 프로젝트별 세션 분리

**현재:**
```
메인 세션 (바질)
├── 1번 작업
├── 2번 작업
└── 일반 대화
→ 모든 컨텍스트 혼재
```

**최적화:**
```
메인 세션 (조율)
├── sessions_spawn("plan-craft-worker")  # 1번 전용
├── sessions_spawn("travelagent-worker")  # 2번 전용
└── 일반 대화
→ 컨텍스트 격리, 병렬 처리
```

#### 1.3 주기적 요약
- 50K 토큰마다 대화 요약
- 오래된 세부사항 제거
- 핵심 결정사항만 유지

---

### Phase 2: 단기 (1주일)

#### 2.1 Vector Database 연동

**추천: Pinecone (무료 플랜)**
- 1M 벡터 무료
- 의미 기반 검색
- API 간단

**구현:**
```bash
# 1. Pinecone 계정 생성
# 2. Index 생성: "openclaw-memory"
# 3. 모든 .md 파일 임베딩 후 업로드
# 4. memory_search 대신 pinecone.query 사용
```

**효과:**
- 검색 속도: 500ms → 50ms (10배 향상)
- 정확도 향상 (의미 기반)
- 대규모 확장 가능

#### 2.2 자동 문서 압축
- 1주일 지난 대화 자동 요약
- 이미지/로그 외부 스토리지 이동
- 핵심 메타데이터만 유지

---

### Phase 3: 중기 (1개월, 선택사항)

#### 3.1 Knowledge Graph (Neo4j)

**구조:**
```
(Project:Plan-Craft)-[:USES]->(Tech:Railway)
(Project:Plan-Craft)-[:HAS_ISSUE]->(Issue:ImageCurator)
(Issue:ImageCurator)-[:FIXED_BY]->(Commit:95266fc)
(Project:Travelagent)-[:USES]->(Tech:Railway)
```

**장점:**
- 관계 추적 명확
- 복잡한 쿼리 가능
- "Plan-Craft와 Travelagent의 공통 기술은?" → 즉시 답변

**단점:**
- 구축 시간 필요
- 유지보수 오버헤드

#### 3.2 Data Fabric (엔터프라이즈급)

**사용 시기:**
- 프로젝트 10개 이상
- 다중 데이터 소스 (DB, API, File 등)
- 실시간 동기화 필요

**현재는 과도함** ❌

---

## 💡 추천 실행 순서

### 오늘 (15분)
1. ✅ index.json 생성 (완료)
2. [ ] 프로젝트별 세션 테스트
   ```bash
   sessions_spawn(
     task="1번 Plan-Craft ImageCurator 테스트 진행",
     label="plan-craft-worker",
     cleanup="keep"
   )
   ```
3. [ ] 대화 요약 (50K 토큰 시점)

### 이번 주
1. [ ] Pinecone 계정 생성
2. [ ] 문서 임베딩 스크립트 작성
3. [ ] memory_search → pinecone 전환

### 다음 달 (필요 시)
1. [ ] 프로젝트 5개 이상 되면 Knowledge Graph 검토
2. [ ] 자동화 파이프라인 구축

---

## 📈 예상 효과

### Before (현재)
- 검색 속도: ~500ms
- 컨텍스트: 50K tokens (계속 증가)
- 응답 지연: 대화 길어질수록 증가

### After (Phase 1)
- 검색 속도: ~50ms (10배 향상)
- 컨텍스트: 프로젝트별 격리
- 응답 지연: 일정 유지

### After (Phase 2)
- 검색 속도: ~20ms (25배 향상)
- 컨텍스트: 자동 압축
- 응답 지연: 감소

---

## 🔧 구현 예시

### 빠른 프로젝트 정보 검색
```javascript
// Before
1. memory_search("plan-craft frontend url")
2. read("memory/projects/1-plan-craft/config.md")
3. 파일에서 URL 파싱
→ 총 ~700ms

// After  
1. read("memory/index.json")
2. index.projects["1"].urls.frontend
→ 총 ~50ms (14배 빠름!)
```

### 프로젝트별 작업
```javascript
// Before
모든 프로젝트가 메인 세션에서 처리
→ 컨텍스트 혼재

// After
sessions_spawn({
  task: "1번 테스트 후 결과 보고",
  label: "plan-craft",
  agentId: "main",
  cleanup: "keep"
})
→ 독립된 컨텍스트
```

---

## 📝 유지보수

### index.json 업데이트 규칙
- 프로젝트 상태 변경 시 즉시 업데이트
- 새 프로젝트 추가 시 구조 유지
- 1일 1회 자동 검증

### 모니터링
- 토큰 사용량 50K마다 체크
- 응답 속도 저하 시 요약 실행
- index.json과 실제 파일 동기화 확인

---

## 🎯 결론

**형님 질문에 대한 답변:**

> 데이터 페브릭이 좋을까?

**추천 순서:**
1. 🥇 **경량 인덱스 + 세션 분리** (즉시, 가장 효과적)
2. 🥈 **Vector DB** (1주일, 검색 속도 극대화)
3. 🥉 **Knowledge Graph** (1개월, 관계 추적 필요 시)
4. ❌ **Data Fabric** (과도, 현재 불필요)

**이유:**
- 현재 프로젝트 2개 → 단순 인덱스면 충분
- 10개 넘어가면 Vector DB 필수
- 100개 넘어가면 Knowledge Graph 고려
- Data Fabric은 엔터프라이즈급 (수백 개 프로젝트)

---

**작성 완료**: 2026-02-10 15:38 GMT+9  
**현재 적용**: Phase 1 (index.json 생성 완료)  
**다음 단계**: 프로젝트별 세션 테스트
