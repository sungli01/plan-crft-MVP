import { useState, useEffect, useCallback } from "react";
import { User, ROUTE_PATHS, checkAccess, DocumentCategory } from "@/lib";

/**
 * Plan_Craft 사용자 인증 및 권한 관리를 위한 커스텀 훅
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 초기 로드 시 로컬 스토리지에서 사용자 정보 복구 (모의 인증)
  useEffect(() => {
    const savedUser = localStorage.getItem("plan_craft_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("사용자 데이터 복구 실패:", error);
        localStorage.removeItem("plan_craft_user");
      }
    }
    setIsLoading(false);
  }, []);

  /**
   * 로그인 처리 (모의 구현)
   * @param email 사용자 이메일
   * @param password 사용자 비밀번호
   */
  const login = useCallback(async (email: string, _password?: string) => {
    setIsLoading(true);
    try {
      // 실제 서비스에서는 API 호출이 이루어지는 부분입니다.
      // 여기서는 테스트를 위한 모의 데이터를 생성합니다.
      const mockUser: User = {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        email: email,
        name: email.split("@")[0] || "사용자",
        role: "user",
        isPro: email.includes("pro"), // 이메일에 'pro'가 포함되면 PRO 계정으로 설정
        createdAt: new Date().toISOString(),
      };

      setUser(mockUser);
      localStorage.setItem("plan_craft_user", JSON.stringify(mockUser));
      return { success: true };
    } catch (error) {
      console.error("로그인 실패:", error);
      return { success: false, message: "로그인 중 오류가 발생했습니다." };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 로그아웃 처리
   */
  const logout = useCallback(() => {
    setUser(null);
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
   * PRO 기능(연구보고서, 투자유치)은 isPro가 true이거나 admin인 경우만 허용
   */
  const canAccessCategory = useCallback((category: DocumentCategory): boolean => {
    return checkAccess(user, category);
  }, [user]);

  /**
   * 관리자 권한 확인
   */
  const isAdmin = user?.role === "admin";

  /**
   * PRO 멤버십 여부 확인 (관리자는 모든 권한 포함)
   */
  const isProMember = !!user?.isPro || isAdmin;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    isProMember,
    login,
    logout,
    updateProfile,
    canAccessCategory,
  };
};
