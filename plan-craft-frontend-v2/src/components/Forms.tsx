import React, { useState } from "react";
import { User, DocumentCategory, cn } from "@/lib";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Loader2, 
  Sparkles, 
  User as UserIcon, 
  Mail, 
  Shield, 
  Crown, 
  Lock, 
  Briefcase, 
  Megaphone, 
  FileCode, 
  Terminal, 
  TrendingUp, 
  Search, 
  Building2 
} from "lucide-react";
import { motion } from "framer-motion";

// Icon mapping helper
const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case "Briefcase": return <Briefcase className="w-5 h-5" />;
    case "Megaphone": return <Megaphone className="w-5 h-5" />;
    case "FileCode": return <FileCode className="w-5 h-5" />;
    case "Terminal": return <Terminal className="w-5 h-5" />;
    case "TrendingUp": return <TrendingUp className="w-5 h-5 text-accent" />;
    case "Search": return <Search className="w-5 h-5 text-accent" />;
    case "Building2": return <Building2 className="w-5 h-5" />;
    default: return <Sparkles className="w-5 h-5" />;
  }
};

/**
 * 로그인 폼 컴포넌트
 */
export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(email, password);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.message || "로그인에 실패했습니다.");
      }
    } catch (err) {
      setError("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-border shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Plan_Craft 로그인</CardTitle>
        <CardDescription className="text-center">
          AI 기반 사내 문서 자동 생성 시스템에 접속하세요
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 주소</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-muted/30"
            />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          {/* Placeholder for additional auth options */}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로그인 중...</>
            ) : (
              "로그인"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * 문서 생성 폼 컴포넌트
 */
export function DocumentGenerationForm({
  category,
  onGenerate,
}: {
  category: DocumentCategory;
  onGenerate: (data: any) => void;
}) {
  const { isProMember } = useAuth();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isLocked = category.isPro && !isProMember;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setIsLoading(true);
    try {
      await onGenerate({ title, context, requirements, categoryId: category.id });
    } catch {
      // Error handled by caller
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category.iconName)}
              {category.label} 생성
            </CardTitle>
            <CardDescription className="mt-1">{category.description}</CardDescription>
          </div>
          {category.isPro && (
            <div className="flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold">
              <Crown className="w-3 h-3" />
              PRO
            </div>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">문서 제목</Label>
              <Input
                id="title"
                placeholder="예: 2026년 차세대 AI 플랫폼 구축 계획서"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="context">주요 내용 및 목적</Label>
              <Textarea
                id="context"
                placeholder="문서에 포함되어야 할 핵심 비즈니스 로직이나 프로젝트의 목표를 설명해주세요."
                className="min-h-[150px] resize-none"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirements">추가 요구사항 (선택)</Label>
              <Input
                id="requirements"
                placeholder="예: 전문 용어 사용, 도표 삽입용 구조 제안 등"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                disabled={isLocked}
              />
            </div>

            {isLocked && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border border-dashed border-muted-foreground/30">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground font-medium">
                  이 카테고리는 PRO 전용 기능입니다. 관리자 승인 후 이용 가능합니다.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <p className="text-xs text-muted-foreground max-w-[60%]">
              AI가 입력한 내용을 바탕으로 초안을 작성합니다. 생성된 문서는 반드시 전문가의 검토를 거쳐야 합니다.
            </p>
            <Button 
              type="submit" 
              className={cn("font-bold min-w-[140px]", category.isPro ? "bg-accent hover:bg-accent/90" : "")}
              disabled={isLoading || isLocked}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 생성 중...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> AI 문서 생성</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

/**
 * 사용자 프로필 관리 폼 컴포넌트
 */
export function ProfileForm({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (data: any) => void;
}) {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      onUpdate({ name, avatarUrl });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full border-border">
      <CardHeader>
        <CardTitle className="text-xl">내 계정 정보</CardTitle>
        <CardDescription>사용자 프로필과 계정 상태를 관리합니다.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-primary" />
                )}
              </div>
              <Button variant="outline" size="sm" type="button">사진 변경</Button>
            </div>

            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">사용자 이름</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소 (수정 불가)</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground border border-border">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>계정 권한</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-sm font-medium border border-border">
                    <Shield className="w-4 h-4 text-primary" />
                    {user.role === "admin" ? "시스템 관리자" : "일반 사용자"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>멤버십 상태</Label>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold border",
                    user.isPro 
                      ? "bg-accent/10 border-accent/20 text-accent"
                      : "bg-muted/50 border-border text-muted-foreground"
                  )}>
                    <Crown className={cn("w-4 h-4", user.isPro ? "text-accent" : "text-muted-foreground")} />
                    {user.isPro ? "PRO 멤버십 활성화" : "FREE 플랜 이용 중"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t p-6">
          {!user.isPro && (
            <Button type="button" variant="outline" className="border-accent text-accent hover:bg-accent/5 font-bold">
              PRO로 업그레이드
            </Button>
          )}
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</> : "프로필 저장"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
