import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plan-Craft v3.0 - AI 사업계획서 생성",
  description: "멀티 에이전트 AI로 고품질 사업계획서를 자동 생성하는 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
