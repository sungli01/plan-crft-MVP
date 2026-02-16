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
  Loader2,
  RefreshCw
} from "lucide-react";
import { 
  ROUTE_PATHS, 
  DOCUMENT_CATEGORIES, 
  getCategoryById, 
  DocumentCategory, 
  cn 
} from "@/lib";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useGenerate } from "@/hooks/useGenerate";
import { loadGeneratingState, saveGeneratingState, clearGeneratingState } from "@/lib/generation-persist";
import { getVersionsApi, downloadVersionHtmlApi, type VersionSummary } from "@/api/versions";
import { DocumentGenerationForm } from "@/components/Forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IMAGES } from "@/assets/images";
import { springPresets, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";
import { toast } from "sonner";

export default function Generate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isProMember, canAccessCategory } = useAuth();
  const { createProject } = useProjects();
  
  const categoryId = searchParams.get("category");
  const existingProjectId = searchParams.get("id");
  const shouldRegenerate = searchParams.get("regenerate") === "true";
  const category = categoryId ? getCategoryById(categoryId) : null;

  const [pageStatus, setPageStatus] = useState<"loading" | "input" | "generating" | "completed">(
    existingProjectId ? "loading" : "input"
  );
  const [generatedDoc, setGeneratedDoc] = useState<{ title: string; content: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(existingProjectId);
  const [savedCategoryId, setSavedCategoryId] = useState<string | null>(categoryId);

  const [versions, setVersions] = useState<VersionSummary[]>([]);

  // Fetch version history when completed
  const fetchVersions = async (pid: string) => {
    try {
      const { versions: v } = await getVersionsApi(pid);
      setVersions(v);
    } catch { /* ignore */ }
  };

  const handleDownloadVersion = async (docId: string) => {
    if (!currentProjectId) return;
    try {
      const blob = await downloadVersionHtmlApi(currentProjectId, docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${docId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("다운로드가 시작되었습니다.");
    } catch {
      toast.error("다운로드에 실패했습니다.");
    }
  };

  const [generationSteps] = useState([
    { id: 1, title: "요구사항 분석", description: "입력된 정보를 분석하고 문서 구조를 설계합니다" },
    { id: 2, title: "콘텐츠 생성", description: "AI 모델을 활용하여 핵심 내용을 작성합니다" },
    { id: 3, title: "구조 최적화", description: "문서의 논리적 흐름과 구성을 최적화합니다" },
    { id: 4, title: "이미지 생성", description: "DALL-E 3 및 차트를 생성하여 문서에 삽입합니다" },
    { id: 5, title: "서식 적용", description: "전문적인 문서 서식과 레이아웃을 적용합니다" }
  ]);

  const { startGenerate, regenerate, download, downloadPptx, openPresentation, resumePolling, status: genStatus, progress: genProgress, currentStep: genStepText } = useGenerate({
    onComplete: (s) => {
      const resolvedCategory = category || (savedCategoryId ? getCategoryById(savedCategoryId) : null);
      setGeneratedDoc({
        title: generatedDoc?.title || `${resolvedCategory?.label || "문서"} 결과물`,
        content: `문서 생성이 완료되었습니다.\n\n섹션 수: ${s.document?.sectionCount || 0}개\n단어 수: ${s.document?.wordCount?.toLocaleString() || 0}개\n이미지: ${s.document?.imageCount || 0}개`,
      });
      setProgress(100);
      setCurrentStep(generationSteps.length);
      setPageStatus("completed");
      toast.success("문서 생성이 완료되었습니다!");
      // Fetch version history
      if (currentProjectId) fetchVersions(currentProjectId);
    },
    onError: () => {
      setPageStatus("input");
    },
  });

  // Update progress from polling status
  useEffect(() => {
    if (genProgress > 0) {
      setProgress(genProgress);
      const stepIndex = Math.min(
        Math.floor((genProgress / 100) * generationSteps.length),
        generationSteps.length - 1
      );
      setCurrentStep(stepIndex);
    }
  }, [genProgress, generationSteps.length]);

  // Load existing project if id parameter exists
  useEffect(() => {
    if (!existingProjectId) return;
    let cancelled = false;

    (async () => {
      try {
        const { getProjectApi } = await import("@/api/projects");
        const project = await getProjectApi(existingProjectId);
        if (cancelled) return;
        setCurrentProjectId(existingProjectId);
        if (project.categoryId) setSavedCategoryId(project.categoryId);

        try {
          const { getGenerateStatusApi } = await import("@/api/generate");
          const s = await getGenerateStatusApi(existingProjectId);
          if (cancelled) return;

          if (s.status === "completed" && s.document) {
            setGeneratedDoc({
              title: project.title || "문서",
              content: `문서 생성 완료\n\n섹션 수: ${s.document.sectionCount || 0}개\n단어 수: ${s.document.wordCount?.toLocaleString() || 0}개\n이미지: ${s.document.imageCount || 0}개`,
            });
            setPageStatus("completed");
            setProgress(100);
            setCurrentStep(generationSteps.length);
            fetchVersions(existingProjectId);
          } else if (s.status === "generating") {
            setGeneratedDoc({ title: project.title || "문서", content: "" });
            setPageStatus("generating");
            // Save to localStorage so revisit can resume
            saveGeneratingState({
              projectId: existingProjectId,
              projectTitle: project.title,
              startedAt: new Date().toISOString(),
              status: "generating",
            });
            resumePolling(existingProjectId);
          } else {
            // draft or other — show download view
            setGeneratedDoc({
              title: project.title || "문서",
              content: "이 프로젝트의 문서를 확인하려면 다운로드하세요.",
            });
            setPageStatus("completed");
            fetchVersions(existingProjectId);
          }
        } catch {
          if (cancelled) return;
          setGeneratedDoc({
            title: project.title || "문서",
            content: "이 프로젝트의 문서를 확인하려면 다운로드하세요.",
          });
          setPageStatus("completed");
          fetchVersions(existingProjectId);
        }
      } catch {
        if (!cancelled) navigate(ROUTE_PATHS.DASHBOARD);
      }
    })();

    return () => { cancelled = true; };
  }, [existingProjectId]);

  // Restore generation state from localStorage on mount (no existingProjectId in URL)
  useEffect(() => {
    if (existingProjectId) return; // handled by the effect above
    const saved = loadGeneratingState();
    if (!saved || saved.status !== "generating") return;

    // There's an in-progress generation – restore it
    setCurrentProjectId(saved.projectId);
    setGeneratedDoc({ title: saved.projectTitle || "문서", content: "" });
    setPageStatus("generating");
    resumePolling(saved.projectId);
  }, [existingProjectId]);

  useEffect(() => {
    // Only redirect to categories if no category AND no existing project AND no saved generation
    const saved = loadGeneratingState();
    if (!category && !existingProjectId && (!saved || saved.status !== "generating")) {
      navigate(ROUTE_PATHS.CATEGORIES);
      return;
    }

    if (category && !canAccessCategory(category)) {
      navigate(ROUTE_PATHS.CATEGORIES);
    }
  }, [category, existingProjectId, canAccessCategory, navigate]);

  const handleGenerate = async (formData: any) => {
    setPageStatus("generating");
    setProgress(0);
    setCurrentStep(0);
    setGeneratedDoc({ title: formData.title || `${category?.label} 결과물`, content: "" });

    try {
      // Create project first
      const project = await createProject({
        title: formData.title || `${category?.label}`,
        idea: formData.context || formData.requirements || formData.title,
        categoryId: category?.id || "business-plan",
      });

      const projectId = project.id || (project as any)._id;
      setCurrentProjectId(projectId);

      // Start generation with polling (pass title for localStorage persistence)
      await startGenerate(projectId, formData.title || category?.label);
    } catch (error: any) {
      // If project creation fails but generate doesn't handle it
      if (pageStatus === "generating") {
        setPageStatus("input");
      }
    }
  };

  // Auto-trigger regeneration when coming from dashboard with regenerate=true
  const [autoRegenTriggered, setAutoRegenTriggered] = useState(false);
  useEffect(() => {
    if (shouldRegenerate && currentProjectId && pageStatus === "completed" && !autoRegenTriggered) {
      setAutoRegenTriggered(true);
      handleRegenerate();
    }
  }, [shouldRegenerate, currentProjectId, pageStatus, autoRegenTriggered]);

  const handleRegenerate = async () => {
    if (!currentProjectId) {
      toast.error("프로젝트 ID가 없습니다.");
      return;
    }
    toast.info("새 버전 문서를 생성합니다...");
    setGeneratedDoc(null);
    setPageStatus("generating");
    setProgress(0);
    setCurrentStep(0);
    try {
      await regenerate(currentProjectId);
    } catch (err: any) {
      toast.error(err?.message || "재생성에 실패했습니다.");
      setPageStatus("completed");
    }
  };

  if (!category && !existingProjectId && !currentProjectId) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 상단 히어로 섹션 */}
      <section className="relative h-48 sm:h-64 flex items-center overflow-hidden">
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
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{category?.label || '문서'} 생성</h1>
              {category?.isPro && (
                <Badge className="bg-accent text-accent-foreground border-none">
                  PRO
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">
              AI를 활용하여 전문적인 {category?.label || '문서'}를 단 몇 분 만에 작성하세요.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <AnimatePresence mode="wait">
          {/* 로딩 상태 */}
          {pageStatus === "loading" && (
            <motion.div
              key="loading-step"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
            </motion.div>
          )}

          {/* 1단계: 입력 폼 */}
          {pageStatus === "input" && category && (
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
          {pageStatus === "generating" && (
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
          {pageStatus === "completed" && generatedDoc && (
            <motion.div
              key="completed-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-border/50 shadow-xl">
                  <CardHeader>
                    <div className="mb-4">
                      <CardTitle className="text-xl sm:text-2xl">{generatedDoc.title}</CardTitle>
                      <CardDescription>AI 초안 생성이 완료되었습니다.</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        {genStatus?.document?.imageCount != null && (
                          <Badge variant="secondary" className="text-xs">
                            이미지 {genStatus.document.imageCount}개
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        if (currentProjectId) download(currentProjectId, true);
                      }}>
                        <Download className="mr-2 h-4 w-4" />
                        미리보기
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (currentProjectId) download(currentProjectId);
                      }}>
                        <Download className="mr-2 h-4 w-4" />
                        HTML 저장
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (currentProjectId) openPresentation(currentProjectId);
                      }}
                        className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        📊 발표자료 (PDF)
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleRegenerate}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        다시 생성
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(generatedDoc.content);
                        toast.success("클립보드에 복사되었습니다.");
                      }}>
                        <Copy className="mr-2 h-4 w-4" />
                        복사
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
                      className="w-full text-orange-600"
                      onClick={handleRegenerate}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      다시 생성하기
                    </Button>
                  </CardContent>
                </Card>

                {/* 버전 히스토리 */}
                {versions.length > 1 && (
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        버전 히스토리
                      </CardTitle>
                      <CardDescription>{versions.length}개 버전</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {versions.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={v.version === versions[0]?.version ? "default" : "secondary"} className="text-xs">
                                v{v.version}
                              </Badge>
                              {v.qualityScore != null && (
                                <span className="text-xs text-muted-foreground">
                                  {v.qualityScore.toFixed(1)}점
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {v.createdAt ? new Date(v.createdAt).toLocaleString("ko-KR") : ""}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadVersion(v.id)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

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
