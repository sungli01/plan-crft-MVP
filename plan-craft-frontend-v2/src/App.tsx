import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ROUTE_PATHS } from "@/lib/index";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import Dashboard from "@/pages/Dashboard";
import Generate from "@/pages/Generate";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function WithLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

/** 홈 라우트: 로그인 상태면 대시보드로, 아니면 랜딩 페이지 */
function HomeRoute() {
  const hasToken = !!localStorage.getItem("plan_craft_token");
  if (hasToken) {
    return <WithLayout><Dashboard /></WithLayout>;
  }
  return <Home />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path={ROUTE_PATHS.HOME} element={<HomeRoute />} />
            <Route path={ROUTE_PATHS.LOGIN} element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path={ROUTE_PATHS.DASHBOARD} element={<WithLayout><Dashboard /></WithLayout>} />
            <Route path={ROUTE_PATHS.CATEGORIES} element={<WithLayout><Categories /></WithLayout>} />
            <Route path={ROUTE_PATHS.GENERATE} element={<WithLayout><Generate /></WithLayout>} />
            <Route path={`${ROUTE_PATHS.GENERATE}/:categoryId`} element={<WithLayout><Generate /></WithLayout>} />
            <Route path={ROUTE_PATHS.PROFILE} element={<WithLayout><Profile /></WithLayout>} />
            <Route path="*" element={<Navigate to={ROUTE_PATHS.HOME} replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner position="top-right" expand={false} richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
