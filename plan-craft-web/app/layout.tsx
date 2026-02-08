import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL('https://plan-crft-mvp-ot41.vercel.app'),
  title: {
    default: 'Plan-Craft v4.0 — AI 멀티에이전트 사업계획서 생성',
    template: '%s | Plan-Craft',
  },
  description: '4개의 AI 에이전트가 협력하여 전문가 수준의 사업계획서를 자동 생성합니다. 87+/100 품질 보장, 8-10분 완성.',
  keywords: ['AI 사업계획서', '비즈니스 플랜', '자동 문서 생성', 'AI 문서', '사업계획서 작성', 'Plan-Craft'],
  authors: [{ name: 'Plan-Craft' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://plan-crft-mvp-ot41.vercel.app',
    siteName: 'Plan-Craft',
    title: 'Plan-Craft — AI 멀티에이전트 사업계획서 생성 플랫폼',
    description: '멀티에이전트 오토리밸런싱 오케스트라를 통한 전문 문서 생성. 무료로 시작하세요.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plan-Craft — AI 사업계획서 자동 생성',
    description: '4개의 AI 에이전트가 협력하여 87+/100 품질의 사업계획서를 생성합니다.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    languages: {
      'ko': '/',
      'en': '/?lang=en',
      'ja': '/?lang=ja',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
