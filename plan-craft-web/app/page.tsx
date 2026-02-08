'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import Header from './components/Header';
import { useToast } from './components/Toast';
import api from './lib/api';
import type { Project } from './types';
import {
  GovernmentIcon,
  DevIcon,
  ResearchIcon,
  BusinessIcon,
  ProposalIcon,
  InvestIcon,
  TechIcon,
  MarketingIcon,
  ArchitectStepIcon,
  WriterStepIcon,
  ImageStepIcon,
  ReviewerStepIcon,
} from './components/Icons';

/* ── Document Types with SVG Icon Components ── */
const DOCUMENT_TYPES: { icon: (props: { className?: string }) => ReactNode; label: string; color: string; category: string }[] = [
  { icon: GovernmentIcon, label: '국가\n사업계획서', color: 'bg-blue-500', category: '국가 사업' },
  { icon: DevIcon, label: '개발기획\n보고서', color: 'bg-purple-500', category: '개발 기획' },
  { icon: ResearchIcon, label: '연구\n보고서', color: 'bg-green-500', category: '연구 보고' },
  { icon: BusinessIcon, label: '비즈니스\n로드맵', color: 'bg-orange-500', category: '비즈니스' },
  { icon: ProposalIcon, label: '사업\n제안서', color: 'bg-red-500', category: '비즈니스' },
  { icon: InvestIcon, label: '투자\n유치서', color: 'bg-indigo-500', category: '투자 유치' },
  { icon: TechIcon, label: '기술\n백서', color: 'bg-teal-500', category: '기술 문서' },
  { icon: MarketingIcon, label: '마케팅\n전략서', color: 'bg-pink-500', category: '마케팅' },
];

const TEMPLATE_CATEGORIES = ['전체', '국가 사업', '개발 기획', '연구 보고', '비즈니스', '마케팅', '투자 유치', '기술 문서'];

/* ── 80+ Templates (10+ per category) ── */
const SAMPLE_TEMPLATES = [
  // ── 국가 사업 (12) ──
  { title: '스마트팜 자동화 시스템', subtitle: '국가 사업계획서', desc: '노지·시설원예 환경 자동제어 및 AI 생육 모니터링 플랫폼 구축', category: '국가 사업' },
  { title: 'AI 의료 영상 진단', subtitle: '국가 사업계획서', desc: 'CT/MRI 기반 딥러닝 의료영상 분석 솔루션 개발', category: '국가 사업' },
  { title: '디지털 트윈 스마트공장', subtitle: '국가 사업계획서', desc: '제조 공정 실시간 시뮬레이션 및 예측 정비 시스템 구축', category: '국가 사업' },
  { title: '탄소중립 에너지 전환', subtitle: '국가 사업계획서', desc: '그린수소 생산·저장·활용 밸류체인 구축 실증사업', category: '국가 사업' },
  { title: '드론 기반 도심 물류', subtitle: '국가 사업계획서', desc: 'UAM 연계 라스트마일 배송 실증 및 비행경로 최적화', category: '국가 사업' },
  { title: '자율주행 셔틀 서비스', subtitle: '국가 사업계획서', desc: '레벨4 자율주행 공유셔틀 상용화 및 규제 샌드박스 신청', category: '국가 사업' },
  { title: '스마트시티 통합 플랫폼', subtitle: '국가 사업계획서', desc: '도시 데이터 통합·분석을 통한 교통·에너지·안전 최적화', category: '국가 사업' },
  { title: '차세대 반도체 R&D', subtitle: '국가 사업계획서', desc: 'GAA 3nm 이하 파운드리 공정 기술 연구개발 사업', category: '국가 사업' },
  { title: '양자컴퓨팅 원천기술', subtitle: '국가 사업계획서', desc: '양자 오류 보정 알고리즘 및 초전도 큐비트 확장 연구', category: '국가 사업' },
  { title: 'K-콘텐츠 글로벌 수출', subtitle: '국가 사업계획서', desc: 'AI 기반 자동 더빙·자막 및 글로벌 OTT 유통 플랫폼', category: '국가 사업' },
  { title: '디지털 헬스케어 플랫폼', subtitle: '국가 사업계획서', desc: 'PHR 기반 맞춤형 건강관리 및 원격진료 통합 시스템', category: '국가 사업' },
  { title: '지능형 로봇 공학 실증', subtitle: '국가 사업계획서', desc: '협동로봇 기반 중소제조 스마트화 및 물류 자동화 실증', category: '국가 사업' },

  // ── 개발 기획 (12) ──
  { title: 'SaaS 프로젝트 관리 플랫폼', subtitle: '개발 기획서', desc: 'Jira 대체 클라우드 네이티브 애자일 프로젝트 관리 도구', category: '개발 기획' },
  { title: 'AI 고객 상담 챗봇', subtitle: '개발 기획서', desc: 'RAG 기반 사내 지식 연동 멀티턴 고객 응대 챗봇 개발', category: '개발 기획' },
  { title: '차세대 ERP 시스템', subtitle: '개발 기획서', desc: '마이크로서비스 기반 클라우드 ERP 재구축 프로젝트', category: '개발 기획' },
  { title: '클라우드 마이그레이션', subtitle: '개발 기획서', desc: '온프레미스 레거시 시스템의 AWS/GCP 하이브리드 전환', category: '개발 기획' },
  { title: 'API 게이트웨이 플랫폼', subtitle: '개발 기획서', desc: 'GraphQL 통합 API 관리·모니터링·버저닝 플랫폼', category: '개발 기획' },
  { title: '실시간 빅데이터 파이프라인', subtitle: '개발 기획서', desc: 'Kafka + Spark 기반 실시간 데이터 수집·분석 아키텍처', category: '개발 기획' },
  { title: 'DevOps CI/CD 자동화', subtitle: '개발 기획서', desc: 'GitOps 기반 배포 파이프라인 및 인프라 자동화 구축', category: '개발 기획' },
  { title: 'IoT 디바이스 관리 플랫폼', subtitle: '개발 기획서', desc: '10만+ 디바이스 원격 관리·OTA·데이터 수집 시스템', category: '개발 기획' },
  { title: '마이크로서비스 전환 프로젝트', subtitle: '개발 기획서', desc: '모놀리식 → 도메인 기반 마이크로서비스 아키텍처 전환', category: '개발 기획' },
  { title: '모바일 슈퍼앱 개발', subtitle: '개발 기획서', desc: 'Flutter 기반 결제·쇼핑·금융 통합 슈퍼앱 MVP 개발', category: '개발 기획' },
  { title: '데이터 웨어하우스 구축', subtitle: '개발 기획서', desc: 'Snowflake/BigQuery 기반 사내 통합 데이터 분석 환경', category: '개발 기획' },
  { title: 'MLOps 플랫폼 구축', subtitle: '개발 기획서', desc: 'Kubeflow 기반 ML 모델 학습·배포·모니터링 자동화', category: '개발 기획' },

  // ── 연구 보고 (12) ──
  { title: 'mRNA 신약 개발 보고', subtitle: '연구 보고서', desc: 'mRNA 기반 항암 치료제 전임상 연구 결과 보고서', category: '연구 보고' },
  { title: '전고체 배터리 기술', subtitle: '연구 보고서', desc: '황화물계 전고체 배터리 소재·공정 핵심기술 연구', category: '연구 보고' },
  { title: '생성형 AI 모델 연구', subtitle: '연구 보고서', desc: 'LLM 미세조정 및 한국어 특화 Foundation Model 개발', category: '연구 보고' },
  { title: '합성 바이오 플랫폼', subtitle: '연구 보고서', desc: '유전자 편집 기반 바이오 파운드리 구축 연구', category: '연구 보고' },
  { title: '나노 소재 응용 연구', subtitle: '연구 보고서', desc: '2D 나노소재 기반 차세대 반도체 채널 소재 연구', category: '연구 보고' },
  { title: '소형 발사체 기술', subtitle: '연구 보고서', desc: '재사용 가능 소형 위성 발사체 엔진 핵심기술 개발', category: '연구 보고' },
  { title: '해양 에너지 하베스팅', subtitle: '연구 보고서', desc: '파력·조류 발전 하이브리드 에너지 변환 시스템 연구', category: '연구 보고' },
  { title: '고엔트로피 합금 신소재', subtitle: '연구 보고서', desc: '극한 환경용 고엔트로피 합금 설계·제조·특성 평가', category: '연구 보고' },
  { title: '유전체 빅데이터 분석', subtitle: '연구 보고서', desc: '한국인 유전체 코호트 기반 질환 연관성 대규모 분석', category: '연구 보고' },
  { title: '기후변화 예측 모델', subtitle: '연구 보고서', desc: 'AI 기반 한반도 기후변화 시나리오 고해상도 예측 연구', category: '연구 보고' },
  { title: '뇌-컴퓨터 인터페이스', subtitle: '연구 보고서', desc: '비침습 BCI 기반 의사소통 보조장치 원천기술 연구', category: '연구 보고' },
  { title: '페로브스카이트 태양전지', subtitle: '연구 보고서', desc: '대면적 페로브스카이트 탠덤 태양전지 효율 30% 돌파 연구', category: '연구 보고' },

  // ── 비즈니스 (12) ──
  { title: '프리미엄 커피 프랜차이즈', subtitle: '비즈니스 계획서', desc: '스페셜티 원두 로스팅 카페 100호점 확장 전략', category: '비즈니스' },
  { title: '크로스보더 이커머스', subtitle: '비즈니스 로드맵', desc: 'K-뷰티·K-푸드 동남아 역직구 플랫폼 사업 계획', category: '비즈니스' },
  { title: '모빌리티 공유 플랫폼', subtitle: '비즈니스 계획서', desc: '전기 킥보드·자전거·스쿠터 통합 공유 모빌리티 서비스', category: '비즈니스' },
  { title: 'O2O 반려동물 케어', subtitle: '비즈니스 로드맵', desc: '반려동물 병원·미용·호텔·산책 O2O 통합 매칭 플랫폼', category: '비즈니스' },
  { title: '밀키트 구독 서비스', subtitle: '비즈니스 계획서', desc: '셰프 레시피 기반 맞춤 밀키트 정기배송 D2C 서비스', category: '비즈니스' },
  { title: '풀필먼트 물류 혁신', subtitle: '비즈니스 로드맵', desc: 'AI 수요예측 기반 당일배송 풀필먼트 센터 운영 전략', category: '비즈니스' },
  { title: '대체식품 푸드테크', subtitle: '비즈니스 계획서', desc: '세포배양육 및 식물성 대체 단백질 상용화 사업 계획', category: '비즈니스' },
  { title: 'AI 맞춤 학습 에듀테크', subtitle: '비즈니스 로드맵', desc: '적응형 학습 알고리즘 기반 K-12 에듀테크 플랫폼', category: '비즈니스' },
  { title: 'AI 계약서 분석 리걸테크', subtitle: '비즈니스 계획서', desc: 'NLP 기반 계약서 자동 분석·리스크 탐지 SaaS', category: '비즈니스' },
  { title: '부동산 프롭테크 플랫폼', subtitle: '비즈니스 로드맵', desc: 'AI 시세 예측·VR 투어·분양 정보 통합 부동산 플랫폼', category: '비즈니스' },
  { title: 'ESG 경영 컨설팅', subtitle: '비즈니스 계획서', desc: '탄소배출 측정·감축 컨설팅 및 ESG 보고서 자동화 서비스', category: '비즈니스' },
  { title: '시니어 헬스케어 서비스', subtitle: '비즈니스 로드맵', desc: 'IoT 기반 독거 고령자 건강관리·긴급알림 통합 서비스', category: '비즈니스' },

  // ── 마케팅 (12) ──
  { title: '인플루언서 마케팅 전략', subtitle: '마케팅 전략서', desc: '마이크로 인플루언서 500명 네트워크 기반 브랜드 캠페인', category: '마케팅' },
  { title: 'SEO 검색 최적화 전략', subtitle: '마케팅 전략서', desc: '키워드 클러스터링 및 토피컬 오소리티 확보 로드맵', category: '마케팅' },
  { title: '브랜디드 콘텐츠 전략', subtitle: '마케팅 전략서', desc: '유튜브·인스타·TikTok 멀티 채널 콘텐츠 마케팅 계획', category: '마케팅' },
  { title: '퍼포먼스 마케팅 플랜', subtitle: '마케팅 전략서', desc: 'Meta·Google·네이버 SA 통합 ROAS 최적화 캠페인 설계', category: '마케팅' },
  { title: 'CRM 고객 리텐션 전략', subtitle: '마케팅 전략서', desc: 'RFM 분석 기반 고객 세분화 및 맞춤 리텐션 시나리오', category: '마케팅' },
  { title: '브랜드 리뉴얼 전략', subtitle: '마케팅 전략서', desc: '브랜드 아이덴티티 재정립 및 리포지셔닝 통합 전략', category: '마케팅' },
  { title: '바이럴 마케팅 캠페인', subtitle: '마케팅 전략서', desc: 'UGC 기반 챌린지·밈 마케팅 바이럴 확산 전략', category: '마케팅' },
  { title: '글로벌 시장 진출 마케팅', subtitle: '마케팅 전략서', desc: '북미·동남아 시장 현지화 GTM 및 미디어 믹스 전략', category: '마케팅' },
  { title: '데이터 드리븐 마케팅', subtitle: '마케팅 전략서', desc: 'CDP 기반 고객 행동 분석 및 AI 개인화 마케팅 자동화', category: '마케팅' },
  { title: '커뮤니티 마케팅 전략', subtitle: '마케팅 전략서', desc: '브랜드 팬덤 커뮤니티 구축 및 앰배서더 프로그램 설계', category: '마케팅' },
  { title: '옴니채널 마케팅 플랜', subtitle: '마케팅 전략서', desc: '온·오프라인 통합 고객 여정 설계 및 터치포인트 최적화', category: '마케팅' },
  { title: '리브랜딩 런칭 캠페인', subtitle: '마케팅 전략서', desc: '신규 브랜드 런칭 D-90 통합 IMC 캠페인 실행 계획', category: '마케팅' },

  // ── 투자 유치 (12) ──
  { title: '시드라운드 IR 자료', subtitle: '투자 유치서', desc: 'Pre-Seed/Seed 3억원 규모 엔젤투자 유치 피치덱', category: '투자 유치' },
  { title: '시리즈 A IR 피치덱', subtitle: '투자 유치서', desc: 'PMF 달성 후 시리즈A 50억원 VC 투자유치 IR자료', category: '투자 유치' },
  { title: '시리즈 B 투자 제안서', subtitle: '투자 유치서', desc: '스케일업 단계 시리즈B 200억원 성장투자 유치 자료', category: '투자 유치' },
  { title: 'ICO/IEO 백서', subtitle: '투자 유치서', desc: '토큰 이코노미 설계 및 글로벌 ICO 발행 투자 유치', category: '투자 유치' },
  { title: '리워드형 크라우드펀딩', subtitle: '투자 유치서', desc: '와디즈·텀블벅 리워드형 크라우드펀딩 캠페인 기획서', category: '투자 유치' },
  { title: '엔젤투자 유치 계획서', subtitle: '투자 유치서', desc: '초기 스타트업 엔젤투자자 대상 5천만원~2억원 유치 계획', category: '투자 유치' },
  { title: 'CVC 전략적 투자 유치', subtitle: '투자 유치서', desc: '대기업 CVC 시너지 기반 전략적 투자 유치 제안서', category: '투자 유치' },
  { title: '정부 보조금 신청서', subtitle: '투자 유치서', desc: 'TIPS·창업성장기술개발 정부 R&D 보조금 사업 신청', category: '투자 유치' },
  { title: '기술보증기금 투자 연계', subtitle: '투자 유치서', desc: '기보·신보 기술평가 기반 투자연계 보증 신청서', category: '투자 유치' },
  { title: '임팩트 투자 유치서', subtitle: '투자 유치서', desc: 'ESG·소셜 임팩트 측정 기반 임팩트 펀드 투자 유치', category: '투자 유치' },
  { title: '프리 시리즈A 브릿지', subtitle: '투자 유치서', desc: '시드~시리즈A 사이 브릿지 라운드 10억원 유치 계획', category: '투자 유치' },
  { title: 'IPO 준비 IR 자료', subtitle: '투자 유치서', desc: '코스닥 상장 준비를 위한 기관투자자 IR 프레젠테이션', category: '투자 유치' },

  // ── 기술 문서 (12) ──
  { title: 'DeFi 프로토콜 백서', subtitle: '기술 백서', desc: '탈중앙화 대출·스테이킹 프로토콜 기술 아키텍처 문서', category: '기술 문서' },
  { title: 'AI/ML 모델 기술 문서', subtitle: '기술 백서', desc: 'Transformer 기반 추천 시스템 모델 설계·학습·배포 문서', category: '기술 문서' },
  { title: '양자 암호화 기술 백서', subtitle: '기술 백서', desc: 'QKD 양자 키 분배 프로토콜 기술 사양 및 구현 가이드', category: '기술 문서' },
  { title: '5G/6G 통신 기술 문서', subtitle: '기술 백서', desc: 'Open RAN 기반 6G 테라헤르츠 통신 핵심기술 문서', category: '기술 문서' },
  { title: '제로트러스트 보안 백서', subtitle: '기술 백서', desc: '제로트러스트 아키텍처 설계 및 SASE 통합 보안 가이드', category: '기술 문서' },
  { title: '클라우드 네이티브 아키텍처', subtitle: '기술 백서', desc: 'K8s 기반 멀티클라우드 아키텍처 설계 및 운영 가이드', category: '기술 문서' },
  { title: '엣지 컴퓨팅 플랫폼', subtitle: '기술 백서', desc: 'MEC 기반 초저지연 엣지 AI 추론 플랫폼 기술 문서', category: '기술 문서' },
  { title: 'AR/VR 렌더링 엔진', subtitle: '기술 백서', desc: 'Foveated Rendering 기반 실시간 XR 렌더링 엔진 기술서', category: '기술 문서' },
  { title: '산업용 디지털 트윈', subtitle: '기술 백서', desc: '물리 시뮬레이션 기반 제조 디지털 트윈 플랫폼 기술 문서', category: '기술 문서' },
  { title: 'REST/GraphQL API 스펙', subtitle: '기술 백서', desc: 'OpenAPI 3.0 기반 통합 API 설계 및 인증·레이트리밋 명세', category: '기술 문서' },
  { title: 'WASM 런타임 기술 문서', subtitle: '기술 백서', desc: 'WebAssembly 기반 서버리스 엣지 런타임 아키텍처 문서', category: '기술 문서' },
  { title: 'LLM 파인튜닝 가이드', subtitle: '기술 백서', desc: 'LoRA/QLoRA 기반 도메인 특화 LLM 파인튜닝 기술 가이드', category: '기술 문서' },
];

/* ── Process Steps with technical details ── */
const PROCESS_STEPS = [
  {
    IconComponent: ArchitectStepIcon,
    agent: 'Architect Agent',
    title: '구조 설계',
    desc: 'Claude Opus 4.6이 사업 아이디어를 분석하여 25+개 섹션의 최적 문서 구조를 자동 설계합니다.',
    details: [
      '산업 분석 → 목차 자동 생성',
      '섹션별 요구사항 정의',
      '글자 수·깊이 자동 산정',
    ],
    techNote: 'Claude Opus 4.6 · 1M Context',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    IconComponent: WriterStepIcon,
    agent: 'Writer Agent (×5)',
    title: '콘텐츠 작성',
    desc: '5개의 Writer 에이전트가 동시에 각 섹션을 병렬 작성하여 속도를 극대화합니다.',
    details: [
      '5개 에이전트 동시 병렬 처리',
      '섹션당 500~1,000자 전문 콘텐츠',
      '개조식 + 계층 구조 자동 적용',
    ],
    techNote: 'Claude Opus 4.6 · 병렬 5x',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    IconComponent: ImageStepIcon,
    agent: 'Image Curator Agent',
    title: '이미지 큐레이션',
    desc: 'AI가 각 섹션의 맥락을 분석하여 적합한 이미지를 자동 검색·생성·배치합니다.',
    details: [
      'Unsplash API 고품질 이미지 검색',
      'AI 생성 다이어그램·차트',
      '자동 캡션 및 위치 최적화',
    ],
    techNote: 'Claude Sonnet 4.5 + Unsplash',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    IconComponent: ReviewerStepIcon,
    agent: 'Reviewer Agent',
    title: '품질 검수',
    desc: '독립된 Reviewer가 전체 문서를 섹션별로 평가하고 87+/100점 품질을 보장합니다.',
    details: [
      '논리성·일관성·완결성 다면 평가',
      '섹션별 점수 + 종합 품질 리포트',
      '기준 미달 섹션 자동 재작성',
    ],
    techNote: 'Claude Sonnet 4.5 · 자동 QA',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

const STATS = [
  { value: '87+/100', label: '품질 점수', icon: '⭐' },
  { value: '8-10분', label: '생성 시간', icon: '⏱️' },
  { value: '4', label: 'AI 에이전트', icon: '🤖' },
  { value: '25+', label: '섹션 구성', icon: '📄' },
];

interface HomeProject {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'agent' | 'document'>('agent');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 자동 로그인 체크
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setIsLoggedIn(true);
      loadProjects();
    }
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjects((response.data.projects || []).slice(0, 10));
    } catch (error) {
      console.error('프로젝트 로딩 실패:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && isLoggedIn) {
      handleFileSelect(files[0]);
    } else if (!isLoggedIn) {
      router.push('/register');
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleFileButtonClick = () => {
    if (!isLoggedIn) {
      showToast('로그인이 필요합니다', 'info');
      router.push('/login');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCreateClick = async (template?: { title: string; subtitle: string; desc: string }) => {
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }

    if (template) {
      await createProjectFromTemplate(template);
    } else if (searchText) {
      await createProjectFromSearch(searchText);
    } else {
      router.push('/create');
    }
  };

  const createProjectFromTemplate = async (template: { title: string; subtitle: string; desc: string }) => {
    try {
      const response = await api.post('/api/projects', { 
        title: template.title,
        idea: template.desc
      });

      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      showToast('프로젝트 생성에 실패했습니다', 'error');
    }
  };

  const createProjectFromSearch = async (text: string) => {
    try {
      const response = await api.post('/api/projects', { 
        title: text.substring(0, 50),
        idea: text
      });

      router.push(`/project/${response.data.project.id}`);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      showToast('프로젝트 생성에 실패했습니다', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      draft: '📝',
      generating: '⏳',
      completed: '✅',
      failed: '❌'
    };
    return icons[status as keyof typeof icons] || '📄';
  };

  const filteredTemplates = selectedCategory === '전체' 
    ? SAMPLE_TEMPLATES 
    : SAMPLE_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 파일 입력 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.pdf,.doc,.docx"
        onChange={handleFileInputChange}
      />

      {/* 헤더 */}
      <Header />

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바 (로그인 시, 데스크톱만) */}
        {isLoggedIn && (
          <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">최근 프로젝트</h3>
              {projects.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">
                  아직 프로젝트가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/project/${project.id}`)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getStatusIcon(project.status)}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                          {project.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push('/projects')}
                className="w-full mt-4 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                전체 프로젝트 보기 →
              </button>
            </div>
          </aside>
        )}

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto">
          <div className={`${isLoggedIn ? 'max-w-5xl' : 'max-w-6xl'} mx-auto px-4 sm:px-6 py-8`}>

            {/* ===== HERO SECTION ===== */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 font-medium mb-4">
                <span>🤖</span>
                <span>4개의 AI 에이전트가 협력하여 문서를 생성합니다</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                전문가급 사업계획서를<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  AI가 자동으로 생성
                </span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Architect가 구조를 설계하고, Writer가 콘텐츠를 작성하고,<br className="hidden sm:block" />
                Image Curator가 이미지를 큐레이션하고, Reviewer가 품질을 검수합니다.<br className="hidden sm:block" />
                <span className="font-medium text-gray-700">아이디어만 입력하면 8-10분 내에 고품질 문서가 완성됩니다.</span>
              </p>
            </div>

            {/* ===== STATS BAR ===== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 max-w-2xl mx-auto">
              {STATS.map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-center shadow-sm">
                  <div className="text-lg mb-0.5">{stat.icon}</div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* 입력 영역 */}
            <div 
              className={`bg-white dark:bg-gray-800 rounded-2xl border-2 ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'} p-4 sm:p-6 mb-8 shadow-sm transition`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
                <button 
                  onClick={() => setMode('agent')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    mode === 'agent' 
                      ? 'bg-pink-50 border border-pink-200' 
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>✨</span>
                  <span>에이전트</span>
                </button>
                <button 
                  onClick={() => setMode('document')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    mode === 'document' 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>📄</span>
                  <span>문서</span>
                </button>
                <div className="flex-1"></div>
                <div className="relative">
                  <button 
                    onClick={() => setShowModeMenu(!showModeMenu)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    Free Mode ▼
                  </button>
                  {showModeMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button 
                        onClick={() => { setShowModeMenu(false); showToast('Free Mode (무료 플랜)', 'info'); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Free Mode
                      </button>
                      <button 
                        onClick={() => { setShowModeMenu(false); showToast('Pro Mode는 준비 중입니다', 'info'); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Pro Mode
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  ➕
                </div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="어떤 문서를 만들고 싶으신가요? 예: AI 기반 물류 플랫폼 사업계획서"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:outline-none text-sm bg-white dark:bg-gray-700 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchText) {
                      handleCreateClick();
                    }
                  }}
                />
              </div>

              {uploadedFile && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span>📎</span>
                    <span className="text-blue-700 font-medium">{uploadedFile.name}</span>
                    <span className="text-gray-500">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <button 
                  onClick={handleFileButtonClick}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>📎</span>
                  <span>파일 첨부</span>
                </button>
                <button 
                  onClick={() => showToast('이미지 추가 기능은 준비 중입니다', 'info')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>🖼️</span>
                  <span>이미지 추가</span>
                </button>
                <button 
                  onClick={() => showToast('데이터 삽입 기능은 준비 중입니다', 'info')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  <span>📊</span>
                  <span>데이터 삽입</span>
                </button>
                <span className="text-gray-400 hidden sm:inline">|</span>
                <span className="hidden sm:inline">드래그앤드롭으로 파일을 추가하세요</span>
                <button 
                  onClick={() => handleCreateClick()}
                  className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  생성 →
                </button>
              </div>
            </div>

            {/* 문서 타입 아이콘들 — SVG Icons */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4 sm:gap-6 mb-12">
              {DOCUMENT_TYPES.map((type, index) => {
                const IconComp = type.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleCreateClick({
                      title: type.label.replace(/\n/g, ' '),
                      subtitle: type.label.replace(/\n/g, ' '),
                      desc: `${type.label.replace(/\n/g, ' ')}를 생성합니다. 프로젝트의 핵심 아이디어와 목표를 입력해주세요.`
                    })}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className="group-hover:scale-110 transition-transform">
                      <IconComp className="w-12 h-12 sm:w-16 sm:h-16" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-700 text-center whitespace-pre-line leading-tight">
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ===== HOW IT WORKS ===== */}
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">어떻게 작동하나요?</h2>
                <p className="text-gray-600 dark:text-gray-400">4개의 전문 AI 에이전트가 순차적으로 협업합니다</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PROCESS_STEPS.map((step, idx) => {
                  const StepIcon = step.IconComponent;
                  return (
                    <div key={idx} className="relative">
                      <div className={`${step.bgColor} border ${step.borderColor} rounded-xl p-5 h-full flex flex-col`}>
                        {/* Header: Icon + Agent info */}
                        <div className="flex items-center gap-3 mb-3">
                          <StepIcon className="w-10 h-10 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 font-medium">Step {idx + 1}</div>
                            <div className="text-sm font-bold text-gray-900 truncate">{step.agent}</div>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{step.desc}</p>

                        {/* Detail bullets */}
                        <ul className="space-y-1.5 mb-3 flex-1">
                          {step.details.map((detail, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-1.5 text-xs text-gray-700">
                              <span className="mt-0.5 text-gray-400">▸</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Tech badge */}
                        <div className="pt-2 border-t border-gray-200/60">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 rounded text-[10px] font-medium text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                            {step.techNote}
                          </span>
                        </div>
                      </div>
                      {/* Arrow connector (desktop only, not last) */}
                      {idx < PROCESS_STEPS.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-300 text-xl z-10">
                          →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 템플릿 섹션 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">템플릿</h2>
              </div>

              {/* 카테고리 탭 */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 템플릿 그리드 — mobile responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {filteredTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleCreateClick(template)}
                    className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition overflow-hidden"
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 via-white to-purple-50 relative p-4 flex flex-col justify-between">
                      <div className="bg-white rounded-lg shadow-sm p-3 flex-1 flex flex-col">
                        <div className="text-xs text-blue-600 font-semibold mb-2">
                          {template.subtitle}
                        </div>
                        <div className="text-sm font-bold text-gray-900 leading-tight mb-2">
                          {template.title}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2 mb-3">
                          {template.desc}
                        </div>
                        <div className="mt-auto space-y-1">
                          <div className="h-1 bg-gray-200 rounded"></div>
                          <div className="h-1 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-1 bg-gray-200 rounded w-3/5"></div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">87+ 품질</span>
                        <span className="text-xs text-gray-500">8-10분</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            {!isLoggedIn && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => router.push('/register')}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg"
                >
                  Plan-Craft에 가입하여 무료로 시작하기 →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-8 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Plan-Craft v3.0</p>
            <p>Claude Opus 4.6 Agent Teams · 87+/100 품질 · 8-10분 생성 · 병렬 처리</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
