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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path={ROUTE_PATHS.HOME} element={<Home />} />
            <Route path={ROUTE_PATHS.LOGIN} element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />

            <Route
              path="/"
              element={
                <Layout>
                  <Routes>
                    <Route index element={<Navigate to={ROUTE_PATHS.HOME} replace />} />
                    <Route path={ROUTE_PATHS.DASHBOARD} element={<Dashboard />} />
                    <Route path={ROUTE_PATHS.CATEGORIES} element={<Categories />} />
                    <Route path={ROUTE_PATHS.GENERATE} element={<Generate />} />
                    <Route path={`${ROUTE_PATHS.GENERATE}/:categoryId`} element={<Generate />} />
                    <Route path={ROUTE_PATHS.PROFILE} element={<Profile />} />
                  </Routes>
                </Layout>
              }
            />

            <Route path="*" element={<Navigate to={ROUTE_PATHS.HOME} replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner position="top-right" expand={false} richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
