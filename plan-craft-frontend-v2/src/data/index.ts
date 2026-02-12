import { DOCUMENT_CATEGORIES, Document, DocumentCategory } from "@/lib/index";

export interface DocumentTemplate {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

export const mockCategories: DocumentCategory[] = DOCUMENT_CATEGORIES;

export const mockDocuments: Document[] = [
  {
    id: "doc-1",
    title: "2026년 AI 기반 스마트 팜 구축 사업계획서",
    categoryId: "business-plan",
    userId: "user-1",
    content: "본 계획서는 인공지능 기술을 활용한 지능형 농장 구축을 목표로 하며...",
    status: "completed",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-01T14:30:00Z",
  },
  {
    id: "doc-2",
    title: "글로벌 시장 진출을 위한 마케팅 전략 기획서",
    categoryId: "marketing",
    userId: "user-1",
    content: "동남아시아 시장을 타겟으로 한 소셜 미디어 인플루언서 협업 전략...",
    status: "draft",
    createdAt: "2026-02-05T10:20:00Z",
    updatedAt: "2026-02-08T18:15:00Z",
  },
  {
    id: "doc-3",
    title: "차세대 블록체인 메인넷 아키텍처 설계서",
    categoryId: "tech-doc",
    userId: "user-1",
    content: "분산 원장 기술의 확장성 문제를 해결하기 위한 샤딩 구조 설계...",
    status: "completed",
    createdAt: "2025-12-20T11:00:00Z",
    updatedAt: "2026-01-10T09:45:00Z",
  },
  {
    id: "doc-4",
    title: "시리즈 B 투자 유치를 위한 IR 피칭 덱",
    categoryId: "investment",
    userId: "user-1",
    content: "매출 성장 지표 및 향후 3개년 재무 추정치를 포함한 투자 제안서...",
    status: "completed",
    createdAt: "2026-01-25T13:00:00Z",
    updatedAt: "2026-02-07T11:20:00Z",
  },
  {
    id: "doc-5",
    title: "2026 범부처 클라우드 전환 사업 제안서",
    categoryId: "national-project",
    userId: "user-1",
    content: "정부 공공기관의 인프라 효율화를 위한 클라우드 네이티브 전환 전략...",
    status: "draft",
    createdAt: "2026-02-09T08:00:00Z",
    updatedAt: "2026-02-09T09:00:00Z",
  },
  {
    id: "doc-6",
    title: "양자 암호 통신 기술 트렌드 연구 보고서",
    categoryId: "research-report",
    userId: "user-1",
    content: "최근 5년간의 양자 암호화 알고리즘 발전 방향과 산업별 적용 사례 분석...",
    status: "completed",
    createdAt: "2026-01-05T15:30:00Z",
    updatedAt: "2026-01-20T10:10:00Z",
  },
];

export const mockTemplates: DocumentTemplate[] = [
  {
    id: "temp-1",
    categoryId: "business-plan",
    title: "스타트업 표준 사업계획서",
    description: "엔젤 투자 및 초기 창업 패키지 신청을 위한 표준 양식",
  },
  {
    id: "temp-2",
    categoryId: "marketing",
    title: "SNS 캠페인 실행 계획서",
    description: "인스타그램, 유튜브 등 매체별 타겟팅 및 예산 배분 양식",
  },
  {
    id: "temp-3",
    categoryId: "tech-doc",
    title: "API 명세서 및 상세 설계서",
    description: "개발자 간 협업을 위한 기술적 인터페이스 정의서 양식",
  },
  {
    id: "temp-4",
    categoryId: "dev-plan",
    title: "애자일 스프린트 로드맵",
    description: "분기별 마일스톤 및 리소스 관리를 위한 개발 계획 양식",
  },
  {
    id: "temp-5",
    categoryId: "investment",
    title: "VC 대응용 전문 IR 덱",
    description: "벤처 캐피탈 심사역이 선호하는 핵심 지표 중심의 제안서 양식",
  },
  {
    id: "temp-6",
    categoryId: "research-report",
    title: "산업 분석 및 동향 보고서",
    description: "시장 규모 추정 및 경쟁사 비교 분석을 위한 전문 리포트 양식",
  },
  {
    id: "temp-7",
    categoryId: "national-project",
    title: "R&D 국책과제 사업계획서",
    description: "정부 지원금 신청을 위한 기술성 및 사업성 평가 대응 양식",
  },
];
