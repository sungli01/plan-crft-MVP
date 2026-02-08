'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'Free 플랜에서 Pro로 언제든 업그레이드할 수 있나요?',
    a: '네, 언제든 Pro로 업그레이드할 수 있습니다. 업그레이드 즉시 Pro 기능이 활성화됩니다.',
  },
  {
    q: '월 3회 제한은 언제 초기화되나요?',
    a: '매월 1일 자정(KST)에 자동으로 초기화됩니다.',
  },
  {
    q: 'Pro 플랜을 해지하면 기존 문서는 어떻게 되나요?',
    a: '해지 후에도 기존에 생성된 모든 문서는 그대로 보관되며 다운로드 가능합니다.',
  },
  {
    q: '팀/기업 플랜도 있나요?',
    a: '현재 준비 중입니다. 5인 이상 팀이라면 문의하기를 통해 별도 상담이 가능합니다.',
  },
  {
    q: '결제 수단은 무엇인가요?',
    a: '신용카드/체크카드(Visa, Mastercard, 국내 카드)를 지원하며, Stripe를 통해 안전하게 처리됩니다.',
  },
];

const FREE_FEATURES = [
  { text: '월 3회 문서 생성', included: true },
  { text: '기본 템플릿 (15개 섹션)', included: true },
  { text: 'PDF/HTML 다운로드', included: true },
  { text: 'AI Sonnet 4.5 모델', included: true },
  { text: '심층 연구 (Pro)', included: false },
  { text: '우선 처리 (Pro)', included: false },
  { text: '무제한 생성 (Pro)', included: false },
];

const PRO_FEATURES = [
  { text: '무제한 문서 생성', included: true },
  { text: '전체 템플릿 (30개 섹션)', included: true },
  { text: 'PDF/HTML 다운로드', included: true },
  { text: 'AI Opus 4.6 + Sonnet 혼합', included: true },
  { text: '심층 연구 (논문/데이터 분석)', included: true },
  { text: '우선 처리', included: true },
  { text: '실시간 WebSocket 진행', included: true },
];

export default function PricingPage() {
  const router = useRouter();
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserPlan(parsed.plan || 'free');
      }
    } catch {
      // not logged in
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 dark:from-black dark:via-gray-900 dark:to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm text-blue-200 font-medium mb-6">
            <span>💎</span>
            <span>심플하고 투명한 요금제</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            당신의 사업계획서에<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              최적의 플랜
            </span>
            을 선택하세요
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Free 플랜으로 시작하고, 더 필요할 때 Pro로 업그레이드하세요.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative -mt-16 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">

            {/* ── Free Card ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Free</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">시작하기에 완벽한 플랜</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">₩0</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">/월</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✅</span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0">❌</span>
                    )}
                    <span className={f.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                disabled={userPlan === 'free'}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
                  userPlan === 'free'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                }`}
              >
                {userPlan === 'free' ? '현재 플랜' : userPlan ? 'Free로 변경' : '무료 시작하기'}
              </button>
            </div>

            {/* ── Pro Card ── */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent p-8 shadow-xl flex flex-col"
              style={{
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              }}
            >
              {/* Dark mode border fix */}
              <div className="absolute inset-0 rounded-2xl dark:bg-gray-800 dark:-m-[2px] dark:border-2 dark:border-transparent -z-10"
                style={{
                  backgroundImage: 'linear-gradient(rgb(31,41,55), rgb(31,41,55)), linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                }}
              />

              {/* 인기 badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-500/30">
                  ⭐ 인기
                </span>
              </div>

              <div className="mb-6 mt-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Pro</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">전문가를 위한 무제한 플랜</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">₩29,900</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">/월</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {PRO_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✅</span>
                    <span className="text-gray-700 dark:text-gray-300">{f.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  if (!userPlan) {
                    router.push('/register');
                  } else {
                    // Future: Stripe checkout
                    alert('결제 시스템 준비 중입니다. 곧 오픈 예정!');
                  }
                }}
                disabled={userPlan === 'pro'}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
                  userPlan === 'pro'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25'
                }`}
              >
                {userPlan === 'pro' ? '현재 플랜' : 'Pro 업그레이드'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table (desktop) */}
      <section className="py-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">기능 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">기능</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Free</th>
                  <th className="text-center py-3 px-4 font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ['월간 생성 횟수', '3회', '무제한'],
                  ['최대 섹션 수', '15개', '30개'],
                  ['AI 모델', 'Sonnet 4.5', 'Opus 4.6 + Sonnet'],
                  ['PDF/HTML 다운로드', '✅', '✅'],
                  ['심층 연구', '❌', '✅'],
                  ['우선 처리', '❌', '✅'],
                  ['실시간 WebSocket', '❌', '✅'],
                  ['이메일 지원', '❌', '✅'],
                ].map(([feature, free, pro], i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{feature}</td>
                    <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">{free}</td>
                    <td className="py-3 px-4 text-center text-gray-900 dark:text-white font-medium">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">자주 묻는 질문</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{faq.q}</span>
                  <span className="text-gray-400 ml-4 flex-shrink-0 transition-transform duration-200"
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▼
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            더 궁금한 점이 있으신가요?
          </p>
          <a
            href="mailto:support@plan-craft.ai"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            ✉️ 문의하기
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-8 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Plan-Craft v3.0</p>
          <p>Claude Opus 4.6 Agent Teams · 87+/100 품질 · 8-10분 생성 · 병렬 처리</p>
        </div>
      </footer>
    </div>
  );
}
