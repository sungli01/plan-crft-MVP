import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  Briefcase,
  Megaphone,
  FileCode,
  Terminal,
  TrendingUp,
  Search,
  Building2,
  Settings
} from "lucide-react";
import { ROUTE_PATHS, DOCUMENT_CATEGORIES, cn } from "@/lib";
import { useAuth } from "@/hooks/useAuth";

const IconMap: Record<string, React.ElementType> = {
  Briefcase,
  Megaphone,
  FileCode,
  Terminal,
  TrendingUp,
  Search,
  Building2,
};

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated, isProMember, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        setHeaderHeight(height);
        document.documentElement.style.setProperty("--header-height", `${height}px`);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navigationLinks = [
    { path: ROUTE_PATHS.HOME, label: "홈", icon: Sparkles },
    { path: ROUTE_PATHS.DASHBOARD, label: "최근작업 문서", icon: LayoutDashboard },
    { path: ROUTE_PATHS.CATEGORIES, label: "문서 카테고리", icon: Briefcase },
    { path: ROUTE_PATHS.DASHBOARD + "?view=all", label: "프로젝트 전체", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-all duration-200"
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={ROUTE_PATHS.HOME} className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Plan_Craft
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navigationLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-foreground">{user?.name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {isProMember ? "PRO 멤버" : "무료 계정"}
                  </span>
                </div>
                {!isProMember && (
                  <Link to={ROUTE_PATHS.PROFILE} className="px-2 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full hover:opacity-90">
                    PRO
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full hover:opacity-90">
                    관리자
                  </Link>
                )}
                <Link to={ROUTE_PATHS.PROFILE} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <User className="w-5 h-5 text-muted-foreground" />
                </Link>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to={ROUTE_PATHS.LOGIN}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              >
                로그인
              </Link>
            )}
            <button
              className="md:hidden p-2 hover:bg-muted rounded-full transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14 sm:pt-16">
        {/* Sidebar - Desktop Only (Fixed on the left) */}
        <aside className="hidden lg:block w-72 border-r border-border h-[calc(100vh-64px)] sticky top-14 sm:top-16 overflow-y-auto bg-sidebar p-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                문서 카테고리
              </h3>
              <div className="space-y-1">
                {DOCUMENT_CATEGORIES.map((cat) => {
                  const Icon = IconMap[cat.iconName] || Briefcase;
                  return (
                    <NavLink
                      key={cat.id}
                      to={`${ROUTE_PATHS.GENERATE}?category=${cat.id}`}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{cat.label}</span>
                      </div>
                      {cat.isPro && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold uppercase">
                          PRO
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                설정
              </h3>
              <div className="space-y-1">
                <NavLink
                  to={ROUTE_PATHS.PROFILE}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                      isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )
                  }
                >
                  <Settings className="w-4 h-4" />
                  <span>프로필 설정</span>
                </NavLink>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 w-full max-w-5xl mx-auto px-3 py-4 sm:p-4 md:p-8">
            {children}
          </div>

          {/* Footer */}
          <footer className="border-t border-border bg-muted/30 py-8 sm:py-12 px-3 sm:px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <div className="col-span-1 md:col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-primary-foreground">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-lg">Plan_Craft</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI 기반 사내 범용 문서 자동 생성 시스템. 복잡한 기획 업무를 단 몇 분 만에 완료하세요.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4 text-sm">서비스</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to={ROUTE_PATHS.DASHBOARD} className="hover:text-primary transition-colors">대시보드</Link></li>
                    <li><Link to={ROUTE_PATHS.CATEGORIES} className="hover:text-primary transition-colors">문서 생성</Link></li>
                    <li><Link to="#" className="hover:text-primary transition-colors">업데이트 소식</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4 text-sm">카테고리</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="#" className="hover:text-primary transition-colors">사업계획서</Link></li>
                    <li><Link to="#" className="hover:text-primary transition-colors">기술문서</Link></li>
                    <li><Link to="#" className="hover:text-primary transition-colors">마케팅 기획</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-4 text-sm">고객지원</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="#" className="hover:text-primary transition-colors">이용약관</Link></li>
                    <li><Link to="#" className="hover:text-primary transition-colors">개인정보처리방침</Link></li>
                    <li><Link to="#" className="hover:text-primary transition-colors">문의하기</Link></li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-border/50 text-xs text-muted-foreground">
                <p>© 2026 Plan_Craft. All rights reserved.</p>
                <div className="flex items-center gap-6">
                  <span>South Korea, Seoul</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>System Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[60] bg-background md:hidden flex flex-col"
          >
            <div className="h-14 sm:h-16 border-b border-border flex items-center justify-between px-4">
              <span className="font-bold">메뉴</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">주요 링크</h3>
                <div className="grid gap-2">
                  {navigationLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <link.icon className="w-5 h-5 text-primary" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">문서 카테고리</h3>
                <div className="grid gap-2">
                  {DOCUMENT_CATEGORIES.map((cat) => {
                    const Icon = IconMap[cat.iconName] || Briefcase;
                    return (
                      <Link
                        key={cat.id}
                        to={`${ROUTE_PATHS.GENERATE}?category=${cat.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">{cat.label}</span>
                        </div>
                        {cat.isPro && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent font-bold">
                            PRO
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {isAuthenticated ? (
              <div className="p-6 border-t border-border bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="p-6 border-t border-border">
                <Link
                  to={ROUTE_PATHS.LOGIN}
                  className="w-full flex items-center justify-center p-3 rounded-lg bg-primary text-primary-foreground font-bold"
                >
                  로그인하여 시작하기
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
