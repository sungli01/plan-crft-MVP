import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '새 프로젝트',
  description: 'AI 멀티에이전트가 협력하여 전문가 수준의 사업계획서를 생성합니다. 프로젝트 정보를 입력하고 시작하세요.',
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
