#!/usr/bin/env node
/**
 * Plan-Craft v2.2 - 200페이지 보장 (섹션 세분화 방식)
 * 
 * 전략: 40개 섹션 → 120개 섹션으로 세분화
 * 예상 결과: 96,000-120,000단어 (192-240페이지)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONFIG = {
  model: 'claude-3-haiku-20240307',
  maxTokensPerRequest: 4096,
  delayBetweenRequests: 2000,
  outputDir: './output',
  progressDir: './progress'
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌ 오류: ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================================================
// 세분화된 120개 섹션 구조
// ============================================================================

const SECTIONS = [
  // 1. 연구개발 과제 개요 → 3개 세분화
  { id: 1, title: '1-1. 과제명 및 주관기관', targetWords: 800, parentTitle: '1. 연구개발 과제 개요',
    prompt: '과제명, 주관기관, 기관 소개, 핵심 역량을 상세히 작성하세요. 최소 800단어.' },
  { id: 2, title: '1-2. 연구 목표 및 필요성', targetWords: 1000, parentTitle: '1. 연구개발 과제 개요',
    prompt: '연구 목표, 필요성, 문제 정의를 구체적으로 작성하세요. 최소 1000단어.' },
  { id: 3, title: '1-3. 기대효과 및 성과지표', targetWords: 800, parentTitle: '1. 연구개발 과제 개요',
    prompt: '기대효과, 정량적 성과지표, 검증 방법을 상세히 작성하세요. 최소 800단어.' },

  // 2. 사업 추진 배경 → 3개 세분화
  { id: 4, title: '2-1. 기술 동향 분석', targetWords: 1200, parentTitle: '2. 사업 추진 배경',
    prompt: '국내외 기술 동향, 최신 연구 사례, 기술 발전 추세를 분석하세요. 최소 1200단어.' },
  { id: 5, title: '2-2. 시장 현황 및 전망', targetWords: 1200, parentTitle: '2. 사업 추진 배경',
    prompt: '시장 규모, 성장률, 주요 플레이어, 시장 전망을 상세히 분석하세요. 최소 1200단어.' },
  { id: 6, title: '2-3. SWOT 및 경쟁 환경 분석', targetWords: 1200, parentTitle: '2. 사업 추진 배경',
    prompt: 'SWOT 분석, 경쟁사 분석, 차별화 전략을 작성하세요. 최소 1200단어.' },

  // 3. 연구개발 목표 및 성과지표 → 3개 세분화
  { id: 7, title: '3-1. 최종 목표 및 비전', targetWords: 1000, parentTitle: '3. 연구개발 목표 및 성과지표',
    prompt: '최종 목표, 비전, 장기 계획을 구체적으로 작성하세요. 최소 1000단어.' },
  { id: 8, title: '3-2. 단계별 세부 목표', targetWords: 1200, parentTitle: '3. 연구개발 목표 및 성과지표',
    prompt: '1차년도, 2차년도, 3차년도 세부 목표를 상세히 작성하세요. 최소 1200단어.' },
  { id: 9, title: '3-3. 정량적 KPI 및 평가 방법', targetWords: 1000, parentTitle: '3. 연구개발 목표 및 성과지표',
    prompt: '측정 가능한 KPI, 평가 방법, 검증 계획을 작성하세요. 최소 1000단어.' },

  // 4. 선행 연구 및 기술 현황 → 3개 세분화
  { id: 10, title: '4-1. 국내외 연구 동향', targetWords: 1500, parentTitle: '4. 선행 연구 및 기술 현황',
    prompt: '국내외 주요 연구 사례 10건 이상 상세 분석. 최소 1500단어.' },
  { id: 11, title: '4-2. 특허 및 논문 분석', targetWords: 1500, parentTitle: '4. 선행 연구 및 기술 현황',
    prompt: '주요 특허, 논문 분석, 기술 트렌드 파악. 최소 1500단어.' },
  { id: 12, title: '4-3. TRL 평가 및 기술 한계', targetWords: 1200, parentTitle: '4. 선행 연구 및 기술 현황',
    prompt: '기술성숙도 평가, 기존 기술의 한계점, 극복 방안. 최소 1200단어.' },

  // 5. 사업 추진 전략 → 3개 세분화
  { id: 13, title: '5-1. 기술 개발 전략', targetWords: 1500, parentTitle: '5. 사업 추진 전략',
    prompt: '기술 개발 로드맵, 핵심 기술, 개발 방법론. 최소 1500단어.' },
  { id: 14, title: '5-2. 사업화 및 협력 전략', targetWords: 1500, parentTitle: '5. 사업 추진 전략',
    prompt: '사업화 계획, 파트너십, 협력 전략. 최소 1500단어.' },
  { id: 15, title: '5-3. 위험 관리 전략', targetWords: 1200, parentTitle: '5. 사업 추진 전략',
    prompt: '리스크 식별, 대응 방안, 비상 계획. 최소 1200단어.' },

  // 6. 연구개발 내용 및 범위 → 3개 세분화
  { id: 16, title: '6-1. 과제 체계도 및 전체 구조', targetWords: 2000, parentTitle: '6. 연구개발 내용 및 범위',
    prompt: '과제 체계도, 전체 구조, 하위 과제 구성. 최소 2000단어.' },
  { id: 17, title: '6-2. 세부 연구 내용', targetWords: 2500, parentTitle: '6. 연구개발 내용 및 범위',
    prompt: '각 하위 과제별 상세 연구 내용. 최소 2500단어.' },
  { id: 18, title: '6-3. 연구 범위 및 제외 사항', targetWords: 1500, parentTitle: '6. 연구개발 내용 및 범위',
    prompt: '연구 범위 명확화, 제외 사항, 경계 설정. 최소 1500단어.' },

  // 7. 기술 아키텍처 및 시스템 설계 → 3개 세분화
  { id: 19, title: '7-1. 전체 시스템 아키텍처', targetWords: 2000, parentTitle: '7. 기술 아키텍처 및 시스템 설계',
    prompt: '시스템 구성도, 계층 구조, 컴포넌트 관계. 최소 2000단어.' },
  { id: 20, title: '7-2. 데이터 아키텍처 및 흐름', targetWords: 2000, parentTitle: '7. 기술 아키텍처 및 시스템 설계',
    prompt: '데이터 모델, 데이터 흐름, 저장소 설계. 최소 2000단어.' },
  { id: 21, title: '7-3. 보안 및 확장성 설계', targetWords: 2000, parentTitle: '7. 기술 아키텍처 및 시스템 설계',
    prompt: '보안 아키텍처, 확장성 고려사항, 성능 설계. 최소 2000단어.' },

  // 8. 구현 계획 → 3개 세분화
  { id: 22, title: '8-1. 단계별 개발 일정', targetWords: 2000, parentTitle: '8. 구현 계획',
    prompt: 'Phase별 일정, 마일스톤, Gantt Chart. 최소 2000단어.' },
  { id: 23, title: '8-2. 테스트 계획', targetWords: 2000, parentTitle: '8. 구현 계획',
    prompt: 'Unit/Integration/System/UAT 테스트 상세 계획. 최소 2000단어.' },
  { id: 24, title: '8-3. 품질 관리 방안', targetWords: 1500, parentTitle: '8. 구현 계획',
    prompt: '품질 관리 프로세스, 검증 기준, QA 체계. 최소 1500단어.' },

  // 9. 핵심 기술 개발 계획 → 3개 세분화
  { id: 25, title: '9-1. 핵심 기술 #1 상세', targetWords: 2000, parentTitle: '9. 핵심 기술 개발 계획',
    prompt: '첫 번째 핵심 기술의 상세 개발 계획. 최소 2000단어.' },
  { id: 26, title: '9-2. 핵심 기술 #2 상세', targetWords: 2000, parentTitle: '9. 핵심 기술 개발 계획',
    prompt: '두 번째 핵심 기술의 상세 개발 계획. 최소 2000단어.' },
  { id: 27, title: '9-3. 핵심 기술 #3 상세', targetWords: 2000, parentTitle: '9. 핵심 기술 개발 계획',
    prompt: '세 번째 핵심 기술의 상세 개발 계획. 최소 2000단어.' },

  // 10-40 섹션도 동일하게 3개씩 세분화... (총 120개)
  // 간결성을 위해 나머지는 패턴만 보여드리고 실제 코드에서는 전체 120개 구현

  // 10. 요구사항 분석 → 3개
  { id: 28, title: '10-1. 기능 요구사항', targetWords: 1200, parentTitle: '10. 요구사항 분석',
    prompt: '상세 기능 요구사항 목록 및 설명. 최소 1200단어.' },
  { id: 29, title: '10-2. 비기능 요구사항', targetWords: 1200, parentTitle: '10. 요구사항 분석',
    prompt: '성능, 보안, 가용성 등 비기능 요구사항. 최소 1200단어.' },
  { id: 30, title: '10-3. 시스템 및 사용자 요구사항', targetWords: 1200, parentTitle: '10. 요구사항 분석',
    prompt: '시스템 요구사항, 사용자 요구사항 상세. 최소 1200단어.' },

  // 11-40 섹션 (각 3개씩 = 90개 추가)
  { id: 31, title: '11-1. 데이터베이스 상세 설계', targetWords: 1500, parentTitle: '11. 상세 설계', prompt: 'ERD, 테이블 구조, 관계 설계. 최소 1500단어.' },
  { id: 32, title: '11-2. API 명세 및 인터페이스', targetWords: 1500, parentTitle: '11. 상세 설계', prompt: 'REST API, GraphQL 명세. 최소 1500단어.' },
  { id: 33, title: '11-3. 모듈별 상세 설계', targetWords: 1500, parentTitle: '11. 상세 설계', prompt: '각 모듈의 입출력, 로직. 최소 1500단어.' },

  { id: 34, title: '12-1. 성능 목표 및 지표', targetWords: 1200, parentTitle: '12. 성능 및 품질 설계', prompt: '응답시간, TPS 목표. 최소 1200단어.' },
  { id: 35, title: '12-2. 부하 테스트 계획', targetWords: 1200, parentTitle: '12. 성능 및 품질 설계', prompt: '부하 테스트 시나리오. 최소 1200단어.' },
  { id: 36, title: '12-3. 품질 관리 프로세스', targetWords: 1200, parentTitle: '12. 성능 및 품질 설계', prompt: 'QA 프로세스, 검증. 최소 1200단어.' },

  { id: 37, title: '13-1. 보안 위협 분석', targetWords: 1200, parentTitle: '13. 보안 설계', prompt: 'OWASP Top 10 대응. 최소 1200단어.' },
  { id: 38, title: '13-2. 인증 및 인가 체계', targetWords: 1200, parentTitle: '13. 보안 설계', prompt: 'JWT, OAuth 설계. 최소 1200단어.' },
  { id: 39, title: '13-3. 암호화 및 컴플라이언스', targetWords: 1200, parentTitle: '13. 보안 설계', prompt: '데이터 암호화, GDPR. 최소 1200단어.' },

  { id: 40, title: '14-1. 목표 시장 분석', targetWords: 1200, parentTitle: '14. 시장 분석', prompt: 'TAM, SAM, SOM 분석. 최소 1200단어.' },
  { id: 41, title: '14-2. 고객 세분화', targetWords: 1200, parentTitle: '14. 시장 분석', prompt: '고객 페르소나, 니즈. 최소 1200단어.' },
  { id: 42, title: '14-3. 경쟁 분석', targetWords: 1200, parentTitle: '14. 시장 분석', prompt: '경쟁사 분석, 포지셔닝. 최소 1200단어.' },

  { id: 43, title: '15-1. 사업화 로드맵', targetWords: 1200, parentTitle: '15. 사업화 전략', prompt: '단계별 사업화 계획. 최소 1200단어.' },
  { id: 44, title: '15-2. 마케팅 전략', targetWords: 1200, parentTitle: '15. 사업화 전략', prompt: 'GTM, 마케팅 믹스. 최소 1200단어.' },
  { id: 45, title: '15-3. 파트너십 전략', targetWords: 1200, parentTitle: '15. 사업화 전략', prompt: '전략적 제휴, 협력. 최소 1200단어.' },

  { id: 46, title: '16-1. 비용 추정', targetWords: 1500, parentTitle: '16. 경제성 분석', prompt: '개발비, 운영비 상세. 최소 1500단어.' },
  { id: 47, title: '16-2. 매출 예측', targetWords: 1500, parentTitle: '16. 경제성 분석', prompt: '5개년 매출 전망. 최소 1500단어.' },
  { id: 48, title: '16-3. ROI 및 재무 분석', targetWords: 1500, parentTitle: '16. 경제성 분석', prompt: 'ROI, NPV, IRR 분석. 최소 1500단어.' },

  { id: 49, title: '17-1. 조직 구성도', targetWords: 800, parentTitle: '17. 추진 체계', prompt: '조직 구조, 보고 체계. 최소 800단어.' },
  { id: 50, title: '17-2. RACI 매트릭스', targetWords: 800, parentTitle: '17. 추진 체계', prompt: '역할과 책임 정의. 최소 800단어.' },
  { id: 51, title: '17-3. 의사결정 체계', targetWords: 800, parentTitle: '17. 추진 체계', prompt: '의사결정 프로세스. 최소 800단어.' },

  { id: 52, title: '18-1. 소요 인력 계획', targetWords: 800, parentTitle: '18. 인력 운영 계획', prompt: '역할별 필요 인원. 최소 800단어.' },
  { id: 53, title: '18-2. M/M 및 투입 계획', targetWords: 800, parentTitle: '18. 인력 운영 계획', prompt: 'Man-Month 계산. 최소 800단어.' },
  { id: 54, title: '18-3. 역량 및 교육 계획', targetWords: 800, parentTitle: '18. 인력 운영 계획', prompt: '교육 훈련 프로그램. 최소 800단어.' },

  { id: 55, title: '19-1. WBS 및 작업 분해', targetWords: 800, parentTitle: '19. 일정 관리 계획', prompt: 'Work Breakdown. 최소 800단어.' },
  { id: 56, title: '19-2. Gantt Chart', targetWords: 800, parentTitle: '19. 일정 관리 계획', prompt: '일정표, 마일스톤. 최소 800단어.' },
  { id: 57, title: '19-3. Critical Path 분석', targetWords: 800, parentTitle: '19. 일정 관리 계획', prompt: '주요 경로, 버퍼. 최소 800단어.' },

  { id: 58, title: '20-1. 총 사업비 산정', targetWords: 800, parentTitle: '20. 예산 계획', prompt: '총 예산 계산. 최소 800단어.' },
  { id: 59, title: '20-2. 비목별 예산', targetWords: 800, parentTitle: '20. 예산 계획', prompt: '인건비, 재료비 등. 최소 800단어.' },
  { id: 60, title: '20-3. 연차별 배분', targetWords: 800, parentTitle: '20. 예산 계획', prompt: '연도별 예산 계획. 최소 800단어.' },

  { id: 61, title: '21-1. 진도 관리', targetWords: 800, parentTitle: '21. 관리 계획', prompt: '진도 추적, 보고. 최소 800단어.' },
  { id: 62, title: '21-2. 품질 관리', targetWords: 800, parentTitle: '21. 관리 계획', prompt: '품질 기준, 검증. 최소 800단어.' },
  { id: 63, title: '21-3. 위험 및 변경 관리', targetWords: 800, parentTitle: '21. 관리 계획', prompt: '리스크, 변경 통제. 최소 800단어.' },

  { id: 64, title: '22-1. 데이터 수집 및 저장', targetWords: 800, parentTitle: '22. 데이터 관리 계획', prompt: '데이터 수집 방법. 최소 800단어.' },
  { id: 65, title: '22-2. 데이터 처리 및 분석', targetWords: 800, parentTitle: '22. 데이터 관리 계획', prompt: '처리 파이프라인. 최소 800단어.' },
  { id: 66, title: '22-3. 데이터 보안 및 백업', targetWords: 800, parentTitle: '22. 데이터 관리 계획', prompt: '보안, 복구 계획. 최소 800단어.' },

  { id: 67, title: '23-1. 특허 출원 계획', targetWords: 800, parentTitle: '23. 지식재산권 확보 전략', prompt: '특허 전략. 최소 800단어.' },
  { id: 68, title: '23-2. 기술 보호 전략', targetWords: 800, parentTitle: '23. 지식재산권 확보 전략', prompt: '영업비밀, 보안. 최소 800단어.' },
  { id: 69, title: '23-3. IP 포트폴리오', targetWords: 800, parentTitle: '23. 지식재산권 확보 전략', prompt: 'IP 관리 체계. 최소 800단어.' },

  { id: 70, title: '24-1. 국내외 표준 준수', targetWords: 700, parentTitle: '24. 표준화 및 인증 계획', prompt: '표준 적용. 최소 700단어.' },
  { id: 71, title: '24-2. 인증 획득 계획', targetWords: 700, parentTitle: '24. 표준화 및 인증 계획', prompt: 'ISO, 인증. 최소 700단어.' },
  { id: 72, title: '24-3. 표준화 활동', targetWords: 700, parentTitle: '24. 표준화 및 인증 계획', prompt: '표준화 참여. 최소 700단어.' },

  { id: 73, title: '25-1. Unit 테스트', targetWords: 1000, parentTitle: '25. 테스트 및 검증 계획', prompt: '단위 테스트 계획. 최소 1000단어.' },
  { id: 74, title: '25-2. Integration 테스트', targetWords: 1000, parentTitle: '25. 테스트 및 검증 계획', prompt: '통합 테스트. 최소 1000단어.' },
  { id: 75, title: '25-3. System/UAT 테스트', targetWords: 1000, parentTitle: '25. 테스트 및 검증 계획', prompt: '시스템, 사용자. 최소 1000단어.' },

  { id: 76, title: '26-1. CI/CD 파이프라인', targetWords: 800, parentTitle: '26. 배포 및 운영 계획', prompt: '자동 배포 체계. 최소 800단어.' },
  { id: 77, title: '26-2. 인프라 구성', targetWords: 800, parentTitle: '26. 배포 및 운영 계획', prompt: '서버, 네트워크. 최소 800단어.' },
  { id: 78, title: '26-3. 모니터링 및 장애 대응', targetWords: 800, parentTitle: '26. 배포 및 운영 계획', prompt: '모니터링, 대응. 최소 800단어.' },

  { id: 79, title: '27-1. 유지보수 체계', targetWords: 600, parentTitle: '27. 유지보수 계획', prompt: '유지보수 프로세스. 최소 600단어.' },
  { id: 80, title: '27-2. 버전 관리', targetWords: 600, parentTitle: '27. 유지보수 계획', prompt: 'Git, 릴리즈. 최소 600단어.' },
  { id: 81, title: '27-3. 기술 지원', targetWords: 600, parentTitle: '27. 유지보수 계획', prompt: '고객 지원 체계. 최소 600단어.' },

  { id: 82, title: '28-1. 논문 게재 계획', targetWords: 700, parentTitle: '28. 성과 확산 계획', prompt: '학술 논문 발표. 최소 700단어.' },
  { id: 83, title: '28-2. 학회 발표', targetWords: 700, parentTitle: '28. 성과 확산 계획', prompt: '컨퍼런스 참여. 최소 700단어.' },
  { id: 84, title: '28-3. 기술 이전', targetWords: 700, parentTitle: '28. 성과 확산 계획', prompt: '기술 확산 전략. 최소 700단어.' },

  { id: 85, title: '29-1. 기술 교육', targetWords: 700, parentTitle: '29. 교육 및 훈련 계획', prompt: '기술 교육 프로그램. 최소 700단어.' },
  { id: 86, title: '29-2. 역량 강화', targetWords: 700, parentTitle: '29. 교육 및 훈련 계획', prompt: '역량 개발 계획. 최소 700단어.' },
  { id: 87, title: '29-3. 지식 이전', targetWords: 700, parentTitle: '29. 교육 및 훈련 계획', prompt: '지식 공유 체계. 최소 700단어.' },

  { id: 88, title: '30-1. 산학연 협력', targetWords: 600, parentTitle: '30. 협력 네트워크 구축', prompt: '대학, 연구소 협력. 최소 600단어.' },
  { id: 89, title: '30-2. 글로벌 파트너십', targetWords: 600, parentTitle: '30. 협력 네트워크 구축', prompt: '해외 협력. 최소 600단어.' },
  { id: 90, title: '30-3. 컨소시엄 구성', targetWords: 600, parentTitle: '30. 협력 네트워크 구축', prompt: '협력 체계. 최소 600단어.' },

  { id: 91, title: '31-1. 연구 윤리', targetWords: 700, parentTitle: '31. 윤리 및 사회적 책임', prompt: '연구 윤리 준수. 최소 700단어.' },
  { id: 92, title: '31-2. 사회적 영향 분석', targetWords: 700, parentTitle: '31. 윤리 및 사회적 책임', prompt: '사회적 임팩트. 최소 700단어.' },
  { id: 93, title: '31-3. 윤리적 고려사항', targetWords: 700, parentTitle: '31. 윤리 및 사회적 책임', prompt: 'AI 윤리, 개인정보. 최소 700단어.' },

  { id: 94, title: '32-1. 환경 친화성', targetWords: 500, parentTitle: '32. 환경 영향 평가', prompt: '친환경 기술. 최소 500단어.' },
  { id: 95, title: '32-2. 탄소 배출 관리', targetWords: 500, parentTitle: '32. 환경 영향 평가', prompt: '탄소 감축 계획. 최소 500단어.' },
  { id: 96, title: '32-3. 지속가능성', targetWords: 500, parentTitle: '32. 환경 영향 평가', prompt: 'ESG 경영. 최소 500단어.' },

  { id: 97, title: '33-1. 관련 법규 준수', targetWords: 700, parentTitle: '33. 법적 검토', prompt: '법규 준수 사항. 최소 700단어.' },
  { id: 98, title: '33-2. 계약 사항', targetWords: 700, parentTitle: '33. 법적 검토', prompt: '계약 조건. 최소 700단어.' },
  { id: 99, title: '33-3. 법적 리스크 관리', targetWords: 700, parentTitle: '33. 법적 검토', prompt: '법적 위험 대응. 최소 700단어.' },

  { id: 100, title: '34-1. 기술 리스크', targetWords: 1000, parentTitle: '34. 리스크 상세 분석', prompt: '기술적 위험 요인. 최소 1000단어.' },
  { id: 101, title: '34-2. 사업 리스크', targetWords: 1000, parentTitle: '34. 리스크 상세 분석', prompt: '사업적 위험 요인. 최소 1000단어.' },
  { id: 102, title: '34-3. 재무 리스크', targetWords: 1000, parentTitle: '34. 리스크 상세 분석', prompt: '재무적 위험 요인. 최소 1000단어.' },

  { id: 103, title: '35-1. 최선 시나리오', targetWords: 800, parentTitle: '35. 대안 시나리오 분석', prompt: '낙관적 전망. 최소 800단어.' },
  { id: 104, title: '35-2. 보통 시나리오', targetWords: 800, parentTitle: '35. 대안 시나리오 분석', prompt: '중립적 전망. 최소 800단어.' },
  { id: 105, title: '35-3. 최악 시나리오', targetWords: 800, parentTitle: '35. 대안 시나리오 분석', prompt: '비관적 전망. 최소 800단어.' },

  { id: 106, title: '36-1. 국내 사례 분석', targetWords: 800, parentTitle: '36. 벤치마킹 연구', prompt: '국내 유사 사례. 최소 800단어.' },
  { id: 107, title: '36-2. 해외 사례 분석', targetWords: 800, parentTitle: '36. 벤치마킹 연구', prompt: '해외 선진 사례. 최소 800단어.' },
  { id: 108, title: '36-3. 시사점 도출', targetWords: 800, parentTitle: '36. 벤치마킹 연구', prompt: '학습 포인트. 최소 800단어.' },

  { id: 109, title: '37-1. 기술 혁신성', targetWords: 800, parentTitle: '37. 혁신성 평가', prompt: '기술적 혁신 요소. 최소 800단어.' },
  { id: 110, title: '37-2. 차별화 요소', targetWords: 800, parentTitle: '37. 혁신성 평가', prompt: '경쟁 우위. 최소 800단어.' },
  { id: 111, title: '37-3. 경쟁력 분석', targetWords: 800, parentTitle: '37. 혁신성 평가', prompt: '시장 경쟁력. 최소 800단어.' },

  { id: 112, title: '38-1. 경제적 파급효과', targetWords: 1000, parentTitle: '38. 파급효과 분석', prompt: '경제적 임팩트. 최소 1000단어.' },
  { id: 113, title: '38-2. 사회적 파급효과', targetWords: 1000, parentTitle: '38. 파급효과 분석', prompt: '사회적 가치. 최소 1000단어.' },
  { id: 114, title: '38-3. 기술적 파급효과', targetWords: 1000, parentTitle: '38. 파급효과 분석', prompt: '기술 확산 효과. 최소 1000단어.' },

  { id: 115, title: '39-1. 장기 운영 계획', targetWords: 700, parentTitle: '39. 지속가능성 계획', prompt: '장기 전략. 최소 700단어.' },
  { id: 116, title: '39-2. 지속 가능 발전', targetWords: 700, parentTitle: '39. 지속가능성 계획', prompt: 'ESG 전략. 최소 700단어.' },
  { id: 117, title: '39-3. 생태계 확장', targetWords: 700, parentTitle: '39. 지속가능성 계획', prompt: '생태계 구축. 최소 700단어.' },

  { id: 118, title: '40-1. 핵심 요약', targetWords: 1200, parentTitle: '40. 종합 결론 및 제언', prompt: '전체 요약. 최소 1200단어.' },
  { id: 119, title: '40-2. 성공 전략', targetWords: 1200, parentTitle: '40. 종합 결론 및 제언', prompt: '성공 요인. 최소 1200단어.' },
  { id: 120, title: '40-3. 향후 계획 및 제언', targetWords: 1200, parentTitle: '40. 종합 결론 및 제언', prompt: '향후 방향. 최소 1200단어.' }
];

// 간단하게 하기 위해 우선 30개만 테스트
// 실제로는 120개 전체를 만들 수 있습니다.

// 나머지 섹션들 추가 (11-40번까지 각각 3개씩 = 90개 추가)
// 총 120개 섹션을 완성

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
}

async function loadProgress(projectId) {
  try {
    const progressFile = `${CONFIG.progressDir}/${projectId}.json`;
    const data = await fs.readFile(progressFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      projectId,
      completedSections: [],
      startTime: Date.now()
    };
  }
}

async function saveProgress(progress) {
  await fs.mkdir(CONFIG.progressDir, { recursive: true });
  const progressFile = `${CONFIG.progressDir}/${progress.projectId}.json`;
  await fs.writeFile(progressFile, JSON.stringify(progress, null, 2), 'utf8');
}

async function saveSectionData(projectId, sectionData) {
  await fs.mkdir(CONFIG.progressDir, { recursive: true });
  const sectionFile = `${CONFIG.progressDir}/${projectId}_section_${sectionData.section.id}.json`;
  await fs.writeFile(sectionFile, JSON.stringify(sectionData, null, 2), 'utf8');
}

async function loadAllSections(projectId) {
  const sections = [];
  for (let i = 1; i <= SECTIONS.length; i++) {
    try {
      const sectionFile = `${CONFIG.progressDir}/${projectId}_section_${i}.json`;
      const data = await fs.readFile(sectionFile, 'utf8');
      sections.push(JSON.parse(data));
    } catch (error) {
      // 섹션 파일 없음
    }
  }
  return sections;
}

async function generateSectionContent(section, projectName, projectIdea) {
  console.log(`\n🤖 섹션 ${section.id}/${SECTIONS.length} 생성 중: ${section.title}`);
  console.log(`   목표: ${section.targetWords}단어`);

  const systemPrompt = `당신은 전문적인 사업계획서 작성 전문가입니다.`;

  const userPrompt = `프로젝트: ${projectName}
아이디어: ${projectIdea}

"${section.parentTitle || section.title}"의 하위 섹션인 "${section.title}"에 대한 내용을 작성하세요.

요구사항:
${section.prompt}

매우 상세하고 구체적으로 작성하세요. Markdown 형식 사용.`;

  try {
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokensPerRequest,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const content = message.content[0].text;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const wordCount = content.split(/\s+/).length;

    console.log(`   ✅ 완료 (${duration}초, ${wordCount}단어)`);

    return {
      section: section,
      content: content,
      wordCount: wordCount,
      tokens: message.usage,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`   ❌ 오류: ${error.message}`);
    if (error.status === 429) {
      console.log(`   ⏳ Rate Limit - 10초 대기 후 재시도...`);
      await sleep(10000);
      return generateSectionContent(section, projectName, projectIdea);
    }
    throw error;
  }
}

function generateHTML(projectName, projectIdea, sections) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const totalPages = Math.ceil(totalWords / 500);

  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${projectName} - 사업계획서 (200페이지)</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24pt;
      font-weight: bold;
      margin-top: 30px;
      margin-bottom: 15px;
      page-break-after: avoid;
    }
    h2 {
      color: #2c3e50;
      font-size: 18pt;
      font-weight: bold;
      margin-top: 25px;
      margin-bottom: 12px;
      border-bottom: 2px solid #3498db;
      padding-bottom: 8px;
    }
    h3 {
      color: #34495e;
      font-size: 14pt;
      font-weight: bold;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    p { margin: 8px 0; text-align: justify; }
    ul, ol { margin: 8px 0; padding-left: 25px; }
    li { margin: 4px 0; }
    .cover {
      text-align: center;
      padding: 80px 0;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 32pt;
      color: #2c3e50;
      margin-bottom: 30px;
    }
    .cover .subtitle {
      font-size: 18pt;
      color: #7f8c8d;
      margin: 15px 0;
    }
    .stats {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .section {
      page-break-inside: avoid;
      margin-bottom: 30px;
    }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${projectName}</h1>
    <div class="subtitle">사업계획서 (완전판)</div>
    <div class="subtitle">국가 R&D 과제 제안서</div>
    <div class="subtitle" style="margin-top: 40px;">${dateStr}</div>
    <div class="stats">
      <h3>📊 문서 정보</h3>
      <p><strong>총 페이지:</strong> 약 ${totalPages}페이지</p>
      <p><strong>총 단어 수:</strong> ${totalWords.toLocaleString()}단어</p>
      <p><strong>섹션 수:</strong> ${sections.length}개 (세분화)</p>
      <p><strong>생성 도구:</strong> Plan-Craft v2.2 (AI 세분화 방식)</p>
    </div>
  </div>

  <div class="page-break">
    <h2>프로젝트 개요</h2>
    <p><strong>프로젝트명:</strong> ${projectName}</p>
    <p><strong>핵심 아이디어:</strong> ${projectIdea}</p>
  </div>

  <div class="page-break">
    <h2>목차</h2>
    <ol>
`;

  sections.forEach((s) => {
    html += `      <li>${s.section.title} (${s.wordCount}단어)</li>\n`;
  });

  html += `    </ol>
  </div>
`;

  sections.forEach((s) => {
    html += `  <div class="section page-break">
    <h1>${s.section.title}</h1>
    ${s.content.replace(/\n/g, '\n    ')}
  </div>\n`;
  });

  html += `</body>\n</html>`;
  return html;
}

async function convertToPDF(htmlFile, pdfFile) {
  console.log('\n📄 PDF 변환 중...');
  
  try {
    // wkhtmltopdf 사용 (설치되어 있다면)
    await execAsync(`wkhtmltopdf --page-size A4 --margin-top 20mm --margin-bottom 20mm --margin-left 20mm --margin-right 20mm "${htmlFile}" "${pdfFile}"`);
    console.log('✅ PDF 변환 완료 (wkhtmltopdf)');
    return true;
  } catch (error) {
    console.log('⚠️  wkhtmltopdf 없음, 대안 방법 시도...');
    
    // Prince XML 시도
    try {
      await execAsync(`prince "${htmlFile}" -o "${pdfFile}"`);
      console.log('✅ PDF 변환 완료 (Prince)');
      return true;
    } catch (error2) {
      console.log('⚠️  Prince 없음');
      console.log('💡 HTML 파일로 제공합니다. 브라우저에서 열어 인쇄→PDF 저장하세요.');
      return false;
    }
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Plan-Craft v2.2 - 200페이지 보장 (세분화 방식)        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const projectName = process.argv[2] || 'AI 기반 스마트 물류 플랫폼';
  const projectIdea = process.argv[3] || `AI와 IoT를 활용하여 물류 배송을 최적화하고, 실시간 추적 및 예측 배송 시스템을 구축하는 혁신적인 플랫폼입니다. 블록체인 기반 투명한 이력 관리와 머신러닝 기반 수요 예측으로 물류 비용을 30% 절감합니다.`;

  // 이어서 생성하는 경우 기존 projectId 사용
  const projectId = process.env.RESUME_PROJECT_ID || `${projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_200p_${Date.now()}`;

  console.log(`📋 프로젝트: ${projectName}`);
  console.log(`📊 생성할 섹션: ${SECTIONS.length}개 (세분화됨)`);
  console.log(`📄 예상 페이지: ${Math.ceil(SECTIONS.reduce((sum, s) => sum + s.targetWords, 0) / 500)}페이지\n`);

  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  await fs.mkdir(CONFIG.progressDir, { recursive: true });

  const progress = await loadProgress(projectId);
  const startTime = progress.startTime;

  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i];
    
    if (progress.completedSections.includes(section.id)) {
      console.log(`⏭️  섹션 ${section.id} - 이미 생성됨`);
      continue;
    }
    
    const result = await generateSectionContent(section, projectName, projectIdea);
    await saveSectionData(projectId, result);
    
    progress.completedSections.push(section.id);
    await saveProgress(progress);

    const progressPct = ((i + 1) / SECTIONS.length * 100).toFixed(1);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.floor(elapsed / (i + 1) * (SECTIONS.length - i - 1));
    
    console.log(`📊 진행률: ${progressPct}% (${i + 1}/${SECTIONS.length})`);
    console.log(`⏱️  경과: ${formatTime(elapsed)} | 남은 시간: ${formatTime(remaining)}\n`);

    if (i < SECTIONS.length - 1) {
      await sleep(CONFIG.delayBetweenRequests);
    }
  }

  console.log('\n📝 HTML 문서 생성 중...');
  const allSections = await loadAllSections(projectId);
  const html = generateHTML(projectName, projectIdea, allSections);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const htmlFile = `${CONFIG.outputDir}/${projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_200p_${timestamp}.html`;
  const pdfFile = htmlFile.replace('.html', '.pdf');
  
  await fs.writeFile(htmlFile, html, 'utf8');

  const totalWords = allSections.reduce((sum, s) => sum + s.wordCount, 0);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ HTML 생성 완료!                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📁 HTML: ${htmlFile}`);
  console.log(`📄 총 페이지: 약 ${Math.ceil(totalWords / 500)}페이지`);
  console.log(`📝 총 단어 수: ${totalWords.toLocaleString()}단어`);
  console.log(`⏱️  소요 시간: ${formatTime(Math.floor(totalTime))}`);

  // PDF 변환 시도
  const pdfSuccess = await convertToPDF(htmlFile, pdfFile);
  
  if (pdfSuccess) {
    console.log(`\n📁 PDF: ${pdfFile}`);
    console.log('✅ PDF 파일 생성 완료!');
  } else {
    console.log(`\n💡 브라우저에서 ${htmlFile}을 열어 Ctrl+P → PDF로 저장하세요.`);
  }
}

main().catch(console.error);
