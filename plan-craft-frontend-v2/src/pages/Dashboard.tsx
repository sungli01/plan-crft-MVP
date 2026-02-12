import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  LayoutDashboard,
  Settings,
  Crown,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileEdit
} from "lucide-react";
import { ROUTE_PATHS, DOCUMENT_CATEGORIES, cn, Document } from "@/lib";
import { DocumentCard, CategoryCard } from "@/components/Cards";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/assets/images";
import { springPresets, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isProMember } = useAuth();
  const { projects, isLoading, deleteProject } = useProjects();

  // Map API projects to Document type for existing DocumentCard component
  const documents: Document[] = projects.map((p) => ({
    id: p.id || (p as any)._id,
    title: p.title,
    categoryId: p.categoryId || "business-plan",
    userId: p.userId || "",
    content: p.content || "",
    status: p.status === "generating" ? "draft" : (p.status as "draft" | "completed"),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  // 최근 문서 필터링 (최신순 4개)
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const stats = [
    {
      label: "전체 문서",
      value: documents.length,
      icon: FileText,
      color: "text-primary"
    },
    {
      label: "작성 중",
      value: documents.filter((d) => d.status === "draft").length,
      icon: FileEdit,
      color: "text-accent"
    },
    {
      label: "완료된 문서",
      value: documents.filter((d) => d.status === "completed").length,
      icon: CheckCircle2,
      color: "text-green-500"
    }
  ];

  const handleEditDocument = (doc: Document) => {
    navigate(`${ROUTE_PATHS.GENERATE}?id=${doc.id}`);
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (confirm("정말로 이 문서를 삭제하시겠습니까?")) {
      try {
        await deleteProject(doc.id);
      } catch {
        // Error handled by mutation
      }
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`${ROUTE_PATHS.GENERATE}?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden border-b border-border bg-card/50 backdrop-blur-sm pt-8 pb-12">
        <div className="absolute inset-0 z-0 opacity-10">
          <img src={IMAGES.WORKSPACE_7} alt="Background" className="h-full w-full object-cover" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  안녕하세요, {user?.name || "사용자"}님
                </h1>
                {isProMember && (
                  <div className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-accent/20">
                    <Crown className="w-3 h-3" />
                    PRO
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">
                오늘은 어떤 문서를 작성해볼까요? AI가 전문적인 초안 작성을 도와드립니다.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                size="lg" 
                className="rounded-full px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                onClick={() => navigate(ROUTE_PATHS.CATEGORIES)}
              >
                <Plus className="mr-2 h-5 w-5" /> 새 문서 만들기
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigate(ROUTE_PATHS.PROFILE)}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10"
          >
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx}
                variants={staggerItem}
                className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm"
              >
                <div className={cn("p-3 rounded-xl bg-muted", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stat.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Recent Documents */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">최근 문서</h2>
              </div>
              <Link to="#" className="text-sm text-primary font-medium hover:underline flex items-center">
                전체 보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            ) : (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {recentDocuments.length > 0 ? (
                  recentDocuments.map((doc) => (
                    <motion.div key={doc.id} variants={staggerItem}>
                      <DocumentCard 
                        document={doc} 
                        onEdit={() => handleEditDocument(doc)} 
                        onDelete={() => handleDeleteDocument(doc)} 
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-2 py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl bg-muted/30">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-muted-foreground">작성된 문서가 없습니다.</p>
                    <Button variant="link" onClick={() => navigate(ROUTE_PATHS.CATEGORIES)}>새 문서 만들기 시작</Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Featured Section / Promotion */}
            <div className="relative h-48 rounded-3xl overflow-hidden shadow-xl">
              <img src={IMAGES.PRESENTATION_1} alt="Promotion" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-8 flex flex-col justify-center">
                <h3 className="text-white text-xl font-bold mb-2">PRO로 업그레이드 하세요</h3>
                <p className="text-white/80 text-sm max-w-md mb-4">
                  연구보고서 및 투자유치 제안서 등 더욱 전문적인 문서 생성을 위한 모든 기능을 잠금 해제하세요.
                </p>
                <Button className="w-fit bg-accent hover:bg-accent/90 text-white border-none" onClick={() => navigate(ROUTE_PATHS.PROFILE)}>
                  지금 시작하기
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Access Categories */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">카테고리 바로가기</h2>
              </div>
            </div>

            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4"
            >
              {DOCUMENT_CATEGORIES.map((category) => (
                <motion.div key={category.id} variants={staggerItem}>
                  <CategoryCard 
                    category={category} 
                    onClick={() => handleCategoryClick(category.id)} 
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>

        </div>
      </div>

      {/* Footer Branding */}
      <footer className="container mx-auto px-4 py-8 border-t border-border mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          © 2026 Plan_Craft. 모든 비즈니스 문서의 시작과 끝을 함께합니다.
        </p>
      </footer>
    </div>
  );
}
