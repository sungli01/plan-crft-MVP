import { useState, useEffect, useCallback } from "react";
import { User, ROUTE_PATHS, checkAccess, DocumentCategory } from "@/lib";
import { loginApi, registerApi, getMeApi } from "@/api/auth";
import { toast } from "sonner";

/**
 * Plan_Craft 사용자 인증 및 권한 관리를 위한 커스텀 훅
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 초기 로드 시 토큰이 있으면 me API로 사용자 정보 복구
  useEffect(() => {
    const token = localStorage.getItem("plan_craft_token");
    if (token) {
      getMeApi()
        .then((userData) => {
          // Map backend user to our User type
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
      // Try loading from localStorage cache (for display before token refresh)
      const savedUser = localStorage.getItem("plan_craft_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("plan_craft_user");
        }
      }
      setIsLoading(false);
    }
  }, []);

  /**
   * 로그인 처리
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await loginApi({ email, password });
      const token = data.token || (data as any).accessToken;
      if (token) {
        localStorage.setItem("plan_craft_token", token);
      }

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

  /**
   * 회원가입 처리
   */
  const register = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const data = await registerApi({ email, password, name });
      
      // Check if pending approval
      if ((data as any).pendingApproval) {
        toast.success("회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
        return { success: true, pendingApproval: true };
      }
      
      const token = (data as any).token || (data as any).accessToken;
      if (token) {
        localStorage.setItem("plan_craft_token", token);
      }

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

  /**
   * 로그아웃 처리
   */
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("plan_craft_token");
    localStorage.removeItem("plan_craft_user");
    window.location.href = ROUTE_PATHS.LOGIN;
  }, []);

  /**
   * 사용자 정보 업데이트
   */
  const updateProfile = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem("plan_craft_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  /**
   * 특정 카테고리에 대한 접근 권한 확인
   */
  const canAccessCategory = useCallback((category: DocumentCategory): boolean => {
    return checkAccess(user, category);
  }, [user]);

  const isAdmin = user?.role === "admin";
  const isProMember = !!user?.isPro || isAdmin;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    isProMember,
    login,
    register,
    logout,
    updateProfile,
    canAccessCategory,
  };
};
