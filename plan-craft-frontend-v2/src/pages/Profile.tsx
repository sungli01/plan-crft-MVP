import React from "react";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Crown,
  LogOut,
  Zap,
  CheckCircle2,
  ArrowRight,
  Settings,
  Star
} from "lucide-react";
import { 
  User, 
  ROUTE_PATHS, 
  cn, 
  formatDate, 
  DOCUMENT_CATEGORIES 
} from "@/lib";
import { ProfileForm } from "@/components/Forms";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { springPresets, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

export default function Profile() {
  const { user, logout, updateProfile, isProMember } = useAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <UserIcon className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">로그인이 필요합니다</h2>
        <p className="text-muted-foreground">프로필을 확인하려면 먼저 로그인해주세요.</p>
        <Button onClick={() => window.location.href = ROUTE_PATHS.LOGIN}>
          로그인 페이지로 이동
        </Button>
      </div>
    );
  }

  const proCategories = DOCUMENT_CATEGORIES.filter(cat => cat.isPro);
  const freeCategories = DOCUMENT_CATEGORIES.filter(cat => !cat.isPro);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-8"
      >
        {/* Header Section */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight">내 프로필</h1>
              {isProMember ? (
                <Badge className="bg-accent text-accent-foreground hover:bg-accent/90 px-3 py-1 flex gap-1 items-center">
                  <Crown className="w-3.5 h-3.5" />
                  PRO 멤버
                </Badge>
              ) : (
                <Badge variant="secondary" className="px-3 py-1">
                  FREE 플랜
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-lg">
              계정 정보 및 멤버십 상태를 관리하세요.
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={logout} 
            className="flex items-center gap-2 w-fit"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Account Summary & Subscription */}
          <div className="lg:col-span-1 space-y-8">
            <motion.div variants={staggerItem}>
              <Card className="overflow-hidden border-border/50 shadow-lg">
                <div className="h-24 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20" />
                <CardContent className="relative pt-0">
                  <div className="flex flex-col items-center -mt-12 mb-6">
                    <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-xl">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="mt-4 text-xl font-bold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-medium">권한:</span>
                      <span className="text-muted-foreground">{user.role === 'admin' ? '관리자' : '일반 사용자'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">가입일:</span>
                      <span className="text-muted-foreground">{formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {!isProMember && (
              <motion.div variants={staggerItem}>
                <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 fill-accent text-accent" />
                      <CardTitle className="text-xl">PRO 업그레이드</CardTitle>
                    </div>
                    <CardDescription className="text-primary-foreground/80">
                      투자유치 및 연구보고서 등 핵심 문서 생성 권한을 획득하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        전문 투자 제안서 생성 (IR 덱)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        심층 연구 및 기술 보고서 자동화
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        우선 순위 AI 프로세싱 지원
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="secondary" className="w-full group font-bold">
                      지금 업그레이드
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {isProMember && (
              <motion.div variants={staggerItem}>
                <Card className="border-accent/30 bg-accent/5">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-accent fill-accent" />
                      <CardTitle className="text-lg">멤버십 혜택</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    귀하는 현재 모든 PRO 기능을 사용할 수 있는 프리미엄 멤버십을 보유하고 있습니다.
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column: Settings & Features */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div variants={staggerItem}>
              <Card className="shadow-sm border-border/60">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Settings className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>계정 정보 수정</CardTitle>
                    <CardDescription>프로필 이름 및 기본 정보를 업데이트합니다.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ProfileForm 
                    user={user} 
                    onUpdate={(data) => updateProfile(data)} 
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card className="shadow-sm border-border/60">
                <CardHeader>
                  <CardTitle>접근 가능한 문서 카테고리</CardTitle>
                  <CardDescription>
                    현재 플랜에서 이용 가능한 문서 생성 범위입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Badge variant="outline" className="font-normal">FREE</Badge>
                        기본 기능
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {freeCategories.map(cat => (
                          <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-transparent">
                            <div className="w-2 h-2 rounded-full bg-primary/40" />
                            <span className="text-sm font-medium">{cat.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />

                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Badge className="bg-accent text-accent-foreground font-normal">PRO</Badge>
                        프리미엄 기능
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {proCategories.map(cat => (
                          <div 
                            key={cat.id} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              isProMember 
                                ? "bg-accent/5 border-accent/20" 
                                : "bg-muted/20 border-border/40 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", isProMember ? "bg-accent" : "bg-muted-foreground")} />
                              <span className="text-sm font-medium">{cat.label}</span>
                            </div>
                            {!isProMember && <Crown className="w-3 h-3 text-muted-foreground" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <footer className="mt-24 pt-8 border-t border-border/40 text-center">
        <p className="text-sm text-muted-foreground">
          © 2026 Plan_Craft. All rights reserved. <br />
          비즈니스의 가치를 문서로 실현하는 가장 스마트한 방법.
        </p>
      </footer>
    </div>
  );
}
