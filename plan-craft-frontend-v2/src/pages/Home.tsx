import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Clock, Shield, ChevronRight, Sparkles } from "lucide-react";
import { ROUTE_PATHS, DOCUMENT_CATEGORIES } from "@/lib/index";
import { CategoryCard, FeatureCard } from "@/components/Cards";
import { IMAGES } from "@/assets/images";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const springPresets = {
  gentle: {
    type: "spring",
    stiffness: 300,
    damping: 35,
  },
  snappy: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: springPresets.gentle,
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // 로그인 상태면 대시보드로 이동
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleCategoryClick = (categoryId: string) => {
    navigate(`${ROUTE_PATHS.GENERATE}?category=${categoryId}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-24">
        <div className="absolute inset-0 z-0">
          <img
            src={IMAGES.WORKSPACE_1}
            alt="Hero Background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/70" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springPresets.gentle}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>2026 차세대 AI 문서 생성 플랫폼</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPresets.gentle, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto"
          >
            당신의 아이디어를 <br />
            <span className="text-primary">완벽한 비즈니스 문서</span>로
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPresets.gentle, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            사업계획서부터 마케팅 전략, 기술 설계서까지. <br />
            전문가의 노하우가 담긴 AI가 단 몇 분 만에 고퀄리티 초안을 생성합니다.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPresets.gentle, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" className="h-14 px-8 text-lg font-semibold" asChild>
              <Link to={ROUTE_PATHS.CATEGORIES}>
                무료로 시작하기
                <ChevronRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold" asChild>
              <a href="#features">기능 살펴보기</a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">왜 Plan_Craft 인가요?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              비즈니스 성공을 위한 가장 빠르고 효율적인 문서 자동화 솔루션을 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="압도적인 생성 속도"
              description="복잡한 구조의 사업계획서도 단 30초면 완성됩니다. 소중한 시간을 핵심 전략 수립에 집중하세요."
              icon={<Zap className="w-6 h-6" />}
            />
            <FeatureCard
              title="산업 표준 템플릿"
              description="수천 건의 성공 사례를 분석하여 도출된 검증된 구조와 논리적인 흐름의 템플릿을 제공합니다."
              icon={<Clock className="w-6 h-6" />}
            />
            <FeatureCard
              title="기업급 보안 및 신뢰"
              description="모든 데이터는 암호화되어 안전하게 관리되며, PRO 모드에서는 관리자 승인 기반의 엄격한 보안 정책을 지원합니다."
              icon={<Shield className="w-6 h-6" />}
            />
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-3xl md:text-4xl font-bold">문서 카테고리</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={ROUTE_PATHS.DASHBOARD}>최근작업 문서</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={ROUTE_PATHS.CATEGORIES}>프로젝트 카테고리</Link>
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground">
                당신의 목적에 맞는 최적의 문서 유형을 선택하세요.
              </p>
            </div>
            <Button variant="ghost" className="group" asChild>
              <Link to={ROUTE_PATHS.CATEGORIES}>
                전체 보기
                <ChevronRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {DOCUMENT_CATEGORIES.slice(0, 4).map((category) => (
              <motion.div key={category.id} variants={fadeInUp}>
                <CategoryCard
                  category={category}
                  onClick={() => handleCategoryClick(category.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={IMAGES.TEAM_WORK_1}
            alt="CTA Background"
            className="w-full h-full object-cover opacity-10 grayscale"
          />
          <div className="absolute inset-0 bg-primary/5" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto bg-card border border-border p-12 md:p-20 rounded-[2rem] text-center shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              지금 바로 첫 문서를 <br />
              생성해보세요
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              더 이상 빈 화면을 보며 고민하지 마세요. <br />
              Plan_Craft가 당신의 비즈니스 가속도를 높여드립니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-10 text-lg font-semibold" asChild>
                <Link to={ROUTE_PATHS.LOGIN}>시작하기</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-semibold" asChild>
                <Link to={ROUTE_PATHS.CATEGORIES}>전체 카테고리</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding Area (Small) */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Plan_Craft</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Plan_Craft. All rights reserved. <br />
            인공지능 기술을 통한 비즈니스 문서 자동화 솔루션
          </p>
        </div>
      </footer>
    </div>
  );
}
