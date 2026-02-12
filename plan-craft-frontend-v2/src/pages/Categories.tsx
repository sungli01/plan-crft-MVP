import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { ROUTE_PATHS, DOCUMENT_CATEGORIES, DocumentCategory } from "@/lib/index";
import { useAuth } from "@/hooks/useAuth";
import { CategoryCard } from "@/components/Cards";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * 문서 카테고리 페이지
 * 총 7개의 카테고리를 제공하며 FREE/PRO 권한을 구분하여 표시합니다.
 */
export default function Categories() {
  const navigate = useNavigate();
  const { user, canAccessCategory, isProMember } = useAuth();

  const freeCategories = DOCUMENT_CATEGORIES.filter((cat) => !cat.isPro);
  const proCategories = DOCUMENT_CATEGORIES.filter((cat) => cat.isPro);

  const handleCategoryClick = (category: DocumentCategory) => {
    if (canAccessCategory(category)) {
      navigate(`${ROUTE_PATHS.GENERATE}?category=${category.id}`);
    } else {
      toast.error("이 기능은 PRO 전용입니다. 관리자에게 PRO 승인을 요청하세요.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              문서 카테고리 <span className="text-primary">선택</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Plan_Craft의 고도화된 AI를 통해 비즈니스에 필요한 모든 문서를 즉시 생성하세요.
              투자유치 및 연구보고서는 PRO 멤버십을 통해 제공됩니다.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 -mt-8">
        <div className="space-y-16">
          {/* Free Categories */}
          <section>
            <div className="flex items-center gap-2 mb-8">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">기본 서비스 (FREE)</h2>
                <p className="text-sm text-muted-foreground">모든 사용자가 이용 가능한 표준 문서 생성 서비스</p>
              </div>
            </div>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {freeCategories.map((category) => (
                <motion.div 
                  key={category.id} 
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                >
                  <CategoryCard 
                    category={category} 
                    onClick={() => handleCategoryClick(category)} 
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Pro Categories */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">프리미엄 서비스 (PRO)</h2>
                  <p className="text-sm text-muted-foreground">심층 분석 및 대외 공신력이 필요한 고도화 문서 서비스</p>
                </div>
              </div>
              {!isProMember && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(ROUTE_PATHS.PROFILE)}
                  className="hidden md:flex items-center gap-2 border-accent text-accent hover:bg-accent/5"
                >
                  PRO 혜택 보기 <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {proCategories.map((category) => (
                <motion.div 
                  key={category.id} 
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  className="relative"
                >
                  <CategoryCard 
                    category={category} 
                    onClick={() => handleCategoryClick(category)} 
                  />
                  {!isProMember && (
                    <div className="absolute top-4 right-4 pointer-events-none">
                      <div className="flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        UPGRADE
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>

            {!isProMember && (
              <div className="mt-12 p-8 rounded-2xl border-2 border-dashed border-accent/20 bg-accent/5 flex flex-col items-center text-center">
                <Crown className="w-12 h-12 text-accent mb-4" />
                <h3 className="text-xl font-bold mb-2">PRO 멤버십으로 더 많은 기능을 누리세요</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  투자유치를 위한 IR 자료와 전문적인 연구 보고서 생성은 오직 PRO 멤버에게만 제공됩니다. 
                  지금 승인을 신청하고 모든 문서 생성을 자동화하세요.
                </p>
                <Button 
                  onClick={() => navigate(ROUTE_PATHS.PROFILE)} 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 h-12 text-lg"
                >
                  지금 PRO 신청하기
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
