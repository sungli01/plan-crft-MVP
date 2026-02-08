import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '요금제',
  description: 'Plan-Craft Free & Pro 요금제 비교. 무료로 월 3회 사업계획서 생성, Pro는 무제한 생성과 심층 연구 기능을 제공합니다.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
