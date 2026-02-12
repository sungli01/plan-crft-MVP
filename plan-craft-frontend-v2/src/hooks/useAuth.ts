import { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from "react";
import React from "react";
import { User, ROUTE_PATHS, checkAccess, DocumentCategory } from "@/lib";
import { loginApi, registerApi, getMeApi, updateProfileApi } from "@/api/auth";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isProMember: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string; pendingApproval?: boolean }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  canAccessCategory: (category: DocumentCategory) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 초기 로드 — 한 번만 실행
  useEffect(() => {
    const token = localStorage.getItem("plan_craft_token");
    if (token) {
      getMeApi()
        .then((userData) => {
          const mappedUser: User = {
            id: (userData as any)._id || (userData as any).id || "",
            email: userData.email,
            name: userData.name || userData.email.split("@")[0],
            avatarUrl: (userData as any).avatarUrl,
            role: (userData as any).role || "user",
            isPro: !!(userData as any).isPro || (userData as any).role === "admin",
            createdAt: (userData as any).createdAt || new Date().toISOString(),
          };
          setUser(mappedUser);
          localStorage.setItem("plan_craft_user", JSON.stringify(mappedUser));
        })
        .catch(() => {
          localStorage.removeItem("plan_craft_token");
          localStorage.removeItem("plan_craft_user");
        })
        .finally(() => setIsLoading(false));
    } else {
      const savedUser = localStorage.getItem("plan_craft_user");
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); } catch { localStorage.removeItem("plan_craft_user"); }
      }
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await loginApi({ email, password });
      const token = data.token || (data as any).accessToken;
      if (token) localStorage.setItem("plan_craft_token", token);

      const rawUser = data.user || data;
      const mappedUser: User = {
        id: (rawUser as any)._id || (rawUser as any).id || "",
        email: rawUser.email,
        name: rawUser.name || rawUser.email.split("@")[0],
        avatarUrl: (rawUser as any).avatarUrl,
        role: (rawUser as any).role || "user",
        isPro: !!(rawUser as any).isPro || (rawUser as any).role === "admin",
        createdAt: (rawUser as any).createdAt || new Date().toISOString(),
      };
      setUser(mappedUser);
      localStorage.setItem("plan_craft_user", JSON.stringify(mappedUser));
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || "로그인에 실패했습니다.";
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const data = await registerApi({ email, password, name });
      if ((data as any).pendingApproval) {
        toast.success("회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
        return { success: true, pendingApproval: true };
      }
      const token = (data as any).token || (data as any).accessToken;
      if (token) localStorage.setItem("plan_craft_token", token);

      const rawUser = (data as any).user || data;
      const mappedUser: User = {
        id: (rawUser as any)._id || (rawUser as any).id || "",
        email: rawUser.email,
        name: rawUser.name || name,
        avatarUrl: (rawUser as any).avatarUrl,
        role: (rawUser as any).role || "user",
        isPro: false,
        createdAt: (rawUser as any).createdAt || new Date().toISOString(),
      };
      setUser(mappedUser);
      localStorage.setItem("plan_craft_user", JSON.stringify(mappedUser));
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || "회원가입에 실패했습니다.";
      toast.error(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("plan_craft_token");
    localStorage.removeItem("plan_craft_user");
    window.location.href = ROUTE_PATHS.LOGIN;
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const apiData: { name?: string } = {};
      if (data.name) apiData.name = data.name;
      const updatedUser = await updateProfileApi(apiData);
      setUser((prev) => {
        if (!prev) return null;
        const merged = { ...prev, ...data, name: updatedUser.name || data.name || prev.name };
        localStorage.setItem("plan_craft_user", JSON.stringify(merged));
        return merged;
      });
      toast.success("프로필이 업데이트되었습니다.");
    } catch {
      toast.error("프로필 업데이트에 실패했습니다.");
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...data };
        localStorage.setItem("plan_craft_user", JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const canAccessCategory = useCallback((category: DocumentCategory): boolean => {
    return checkAccess(user, category);
  }, [user]);

  const isAdmin = user?.role === "admin";
  const isProMember = !!user?.isPro || isAdmin;

  const value: AuthContextType = {
    user, isLoading, isAuthenticated: !!user, isAdmin, isProMember,
    login, register, logout, updateProfile, canAccessCategory,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

/**
 * useAuth hook — must be used inside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
