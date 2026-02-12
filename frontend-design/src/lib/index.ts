export const ROUTE_PATHS = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  CATEGORIES: "/categories",
  GENERATE: "/generate",
  PROFILE: "/profile",
  LOGIN: "/login",
} as const;

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: "user" | "admin";
  isPro: boolean;
  createdAt: string;
}

export interface DocumentCategory {
  id: string;
  label: string;
  description: string;
  isPro: boolean;
  iconName: string;
}

export interface Document {
  id: string;
  title: string;
  categoryId: string;
  userId: string;
  content: string;
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: "business-plan",
    label: "사업계획서",
    description: "비즈니스 모델 및 시장 분석을 포함한 종합 사업 계획서 생성",
    isPro: false,
    iconName: "Briefcase",
  },
  {
    id: "marketing",
    label: "마케팅",
    description: "시장 진입 전략 및 홍보 마케팅 캠페인 기획서 작성",
    isPro: false,
    iconName: "Megaphone",
  },
  {
    id: "tech-doc",
    label: "기술문서",
    description: "시스템 아키텍처 및 상세 설계 사양서 자동화 작성",
    isPro: false,
    iconName: "FileCode",
  },
  {
    id: "dev-plan",
    label: "개발계획",
    description: "프로젝트 일정 및 리소스 할당을 위한 개발 로드맵 구축",
    isPro: false,
    iconName: "Terminal",
  },
  {
    id: "investment",
    label: "투자유치",
    description: "IR 피칭 덱 및 VC 대응을 위한 전문 투자 제안서 (PRO 전용)",
    isPro: true,
    iconName: "TrendingUp",
  },
  {
    id: "research-report",
    label: "연구보고서",
    description: "데이터 분석 기반의 심층 연구 및 학술적 기술 보고서 (PRO 전용)",
    isPro: true,
    iconName: "Search",
  },
  {
    id: "national-project",
    label: "국가사업",
    description: "정부 지원 사업 및 국책 과제 수행을 위한 맞춤형 제안서",
    isPro: false,
    iconName: "Building2",
  },
];

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function cn(...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]): string {
  const classes = inputs.flatMap((input) => {
    if (!input) return [];
    if (typeof input === "string") return [input];
    return Object.entries(input)
      .filter(([_, value]) => value)
      .map(([key]) => key);
  });
  return classes.join(" ");
}

export function getCategoryById(id: string): DocumentCategory | undefined {
  return DOCUMENT_CATEGORIES.find((cat) => cat.id === id);
}

export function checkAccess(user: User | null, category: DocumentCategory): boolean {
  if (!category.isPro) return true;
  return !!user?.isPro || user?.role === "admin";
}
