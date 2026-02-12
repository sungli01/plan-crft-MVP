import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Wand2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Download, 
  Copy,
  Loader2
} from "lucide-react";
import { 
  ROUTE_PATHS, 
  DOCUMENT_CATEGORIES, 
  getCategoryById, 
  DocumentCategory, 
  cn 
} from "@/lib";
import { useAuth } from "@/hooks/useAuth";
import { DocumentGenerationForm } from "@/components/Forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IMAGES } from "@/assets/images";
import { springPresets, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

export default function Generate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isProMember, canAccessCategory } = useAuth();
  
  const categoryId = searchParams.get("category");
  const category = categoryId ? getCategoryById(categoryId) : null;

  const [status, setStatus] = useState<"input" | "generating" | "completed">("input");
  const [generatedDoc, setGeneratedDoc] = useState<{ title: string; content: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [generationSteps] = useState([
    { id: 1, title: "요구사항 분석", description: "입력된 정보를 분석하고 문서 구조를 설계합니다" },
    { id: 2, title: "콘텐츠 생성", description: "AI 모델을 활용하여 핵심 내용을 작성합니다" },
    { id: 3, title: "구조 최적화", description: "문서의 논리적 흐름과 구성을 최적화합니다" },
    { id: 4, title: "품질 검증", description: "생성된 내용의 일관성과 품질을 검증합니다" },
    { id: 5, title: "서식 적용", description: "전문적인 문서 서식과 레이아웃을 적용합니다" }
  ]);

  useEffect(() => {
    if (!category) {
      navigate(ROUTE_PATHS.CATEGORIES);
      return;
    }

    if (!canAccessCategory(category)) {
      navigate(ROUTE_PATHS.CATEGORIES);
    }
  }, [category, canAccessCategory, navigate]);

  const handleGenerate = async (formData: any) => {
    setStatus("generating");
    setProgress(0);
    setCurrentStep(0);

    // 단계별 AI 생성 시뮬레이션
    for (let step = 0; step < generationSteps.length; step++) {
      setCurrentStep(step);
      
      // 각 단계별 진행 시간 (실제로는 AI 처리 시간)
      const stepDuration = [800, 1200, 900, 700, 600][step];
      const stepProgress = (step / generationSteps.length) * 100;
      
      // 단계 시작
      setProgress(stepProgress);
      
      // 단계 내 세부 진행률
      const stepInterval = setInterval(() => {
        setProgress((prev) => {
          const nextStepProgress = ((step + 1) / generationSteps.length) * 100;
          const currentStepProgress = (step / generationSteps.length) * 100;
          const maxProgress = currentStepProgress + ((nextStepProgress - currentStepProgress) * 0.9);
          
          if (prev >= maxProgress) {
            return maxProgress;
          }
          return prev + Math.random() * 3;
        });
      }, 100);
      
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
      clearInterval(stepInterval);
      
      // 단계 완료
      setProgress(((step + 1) / generationSteps.length) * 100);
    }

    // 문서 생성 완료
    setGeneratedDoc({
      title: formData.title || `${category?.label} 결과물`,
      content: `[AI 생성 결과물]\n\n본 문서는 Plan_Craft AI에 의해 생성된 ${category?.label} 초안입니다.\n\n입력된 정보:\n- 문서 제목: ${formData.title || "제목 없음"}\n- 목적: ${formData.purpose || "일반 정보 제공"}\n- 대상: ${formData.target || "일반"}\n- 생성 일시: ${new Date().toLocaleString("ko-KR")}\n\n== 문서 개요 ==\n\n${category?.label}는 조직의 전략적 목표 달성을 위한 핵심 문서입니다. 본 초안은 다음과 같은 구조로 구성되어 있습니다:\n\n1. 현황 분석\n   - 시장 환경 및 경쟁 상황 분석\n   - 내부 역량 및 자원 현황 검토\n   - 기회 요인 및 위험 요소 식별\n\n2. 전략 방향\n   - 비전 및 목표 설정\n   - 핵심 전략 및 추진 방향\n   - 성과 지표 및 측정 방법\n\n3. 실행 계획\n   - 단계별 추진 일정\n   - 필요 자원 및 예산 계획\n   - 조직 체계 및 역할 분담\n\n4. 기대 효과\n   - 정량적 성과 목표\n   - 정성적 개선 효과\n   - 리스크 관리 방안\n\n== 상세 내용 ==\n\n[이 부분에는 실제 비즈니스 상황에 맞는 구체적인 내용이 포함됩니다]\n\n본 문서는 AI 기반 초안으로, 실제 활용 시 다음 사항을 고려하시기 바랍니다:\n\n⚠️ 주의사항:\n- 생성된 내용은 일반적인 가이드라인이며, 실제 상황에 맞게 수정이 필요합니다\n- 중요한 의사결정 시 관련 전문가의 검토를 받으시기 바랍니다\n- 법적, 재무적 내용은 반드시 해당 분야 전문가의 확인이 필요합니다\n\n생성 완료 시간: ${new Date().toLocaleString("ko-KR")}`,
    });
    
    setStatus("completed");
  };

  if (!category) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 상단 히어로 섹션 */}
      <section className="relative h-64 flex items-center overflow-hidden">
        <img 
          src={IMAGES.AUTOMATION_8} 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/40 to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springPresets.gentle}
          >
            <Button 
              variant="ghost" 
              className="mb-4 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              뒤로가기
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold">{category.label} 생성</h1>
              {category.isPro && (
                <Badge className="bg-accent text-accent-foreground border-none">
                  PRO
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">
              AI를 활용하여 전문적인 {category.label}를 단 몇 분 만에 작성하세요.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <AnimatePresence mode="wait">
          {/* 1단계: 입력 폼 */}
          {status === "input" && (
            <motion.div
              key="input-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={springPresets.gentle}
            >
              <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    문서 정보 입력
                  </CardTitle>
                  <CardDescription>
                    생성하고자 하는 문서의 핵심 정보를 입력해주세요. 구체적일수록 더 나은 결과가 생성됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentGenerationForm 
                    category={category} 
                    onGenerate={handleGenerate} 
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 2단계: 생성 중 모니터링 화면 */}
          {status === "generating" && (
            <motion.div
              key="generating-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader className="text-center pb-8">
                  <div className="relative mb-6 mx-auto w-24 h-24">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="w-full h-full rounded-full border-4 border-primary/20 border-t-primary"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">AI 문서 생성 진행 중</CardTitle>
                  <CardDescription className="text-base">
                    고품질 {category?.label}를 생성하기 위해 다단계 AI 처리를 수행하고 있습니다
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  {/* 전체 진행률 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">전체 진행률</span>
                      <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                      <motion.div 
                        className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* 단계별 진행 상황 */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg mb-4">처리 단계</h3>
                    <div className="grid gap-4">
                      {generationSteps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;
                        const isPending = index > currentStep;
                        
                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                              "flex items-start gap-4 p-4 rounded-lg border transition-all duration-300",
                              isCompleted && "bg-primary/5 border-primary/20",
                              isCurrent && "bg-accent/10 border-accent/30 shadow-md",
                              isPending && "bg-muted/30 border-border/50"
                            )}
                          >
                            <div className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                              isCompleted && "bg-primary text-primary-foreground",
                              isCurrent && "bg-accent text-accent-foreground animate-pulse",
                              isPending && "bg-muted text-muted-foreground"
                            )}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : isCurrent ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                step.id
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={cn(
                                "font-medium transition-colors duration-300",
                                isCompleted && "text-primary",
                                isCurrent && "text-accent",
                                isPending && "text-muted-foreground"
                              )}>
                                {step.title}
                              </h4>
                              <p className={cn(
                                "text-sm mt-1 transition-colors duration-300",
                                isCompleted && "text-primary/70",
                                isCurrent && "text-accent/70",
                                isPending && "text-muted-foreground/70"
                              )}>
                                {step.description}
                              </p>
                              {isCurrent && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="mt-2 text-xs text-accent font-medium flex items-center gap-1"
                                >
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="w-1.5 h-1.5 bg-accent rounded-full"
                                  />
                                  처리 중...
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 예상 완료 시간 */}
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      <FileText className="inline h-4 w-4 mr-1" />
                      예상 완료 시간: 약 {Math.max(1, Math.ceil((100 - progress) / 20))}분 남음
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 3단계: 결과 확인 */}
          {status === "completed" && generatedDoc && (
            <motion.div
              key="completed-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-border/50 shadow-xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{generatedDoc.title}</CardTitle>
                      <CardDescription>AI 초안 생성이 완료되었습니다.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(generatedDoc.content);
                        alert("클립보드에 복사되었습니다.");
                      }}>
                        <Copy className="mr-2 h-4 w-4" />
                        복사
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        다운로드
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap min-h-[400px] border border-border/50">
                      {generatedDoc.content}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      다음 단계 안내
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</div>
                      <p className="text-sm text-muted-foreground">생성된 초안의 내용을 검토하고 비즈니스 상황에 맞춰 수정하세요.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</div>
                      <p className="text-sm text-muted-foreground">관련 팀원들과 공유하여 피드백을 수렴하세요.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</div>
                      <p className="text-sm text-muted-foreground">필요 시 PDF나 Word 형식으로 다운로드하여 보고를 완료하세요.</p>
                    </div>
                    <Button 
                      className="w-full mt-4 bg-primary text-primary-foreground"
                      onClick={() => navigate(ROUTE_PATHS.DASHBOARD)}
                    >
                      대시보드로 이동
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setStatus("input")}
                    >
                      다시 생성하기
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-destructive/20 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      주의사항
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      AI가 생성한 문서는 통계적 모델을 기반으로 하며, 실제 법률적, 재무적 효력을 보장하지 않습니다. 중요한 비즈니스 의사결정 시 반드시 전문가의 법적/기술적 검토를 거치시기 바랍니다.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
