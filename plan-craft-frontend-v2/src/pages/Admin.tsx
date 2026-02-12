import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Crown, CheckCircle2, XCircle, Trash2, UserCog } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/lib";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AdminUser,
  getAdminUsers,
  updateUserPlan,
  updateUserRole,
  approveUser,
  deleteUser,
} from "@/api/admin";

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD);
      return;
    }
    if (!authLoading && isAdmin) {
      fetchUsers();
    }
  }, [authLoading, isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAdminUsers();
      setUsers(data);
    } catch {
      toast.error("사용자 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId);
      toast.success("사용자가 승인되었습니다.");
      fetchUsers();
    } catch {
      toast.error("승인에 실패했습니다.");
    }
  };

  const handlePlanToggle = async (user: AdminUser) => {
    const newPlan = user.plan === "pro" ? "free" : "pro";
    try {
      await updateUserPlan(user.id, newPlan);
      toast.success(`${user.email}의 플랜이 ${newPlan.toUpperCase()}로 변경되었습니다.`);
      fetchUsers();
    } catch {
      toast.error("플랜 변경에 실패했습니다.");
    }
  };

  const handleRoleToggle = async (user: AdminUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateUserRole(user.id, newRole);
      toast.success(`${user.email}의 역할이 ${newRole}로 변경되었습니다.`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "역할 변경에 실패했습니다.");
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`정말 ${user.email} 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await deleteUser(user.id);
      toast.success("사용자가 삭제되었습니다.");
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "삭제에 실패했습니다.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold">관리자 패널</h1>
        <Badge variant="outline" className="ml-2">{users.length}명</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            사용자 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4">이름</th>
                  <th className="pb-3 pr-4">이메일</th>
                  <th className="pb-3 pr-4">가입일</th>
                  <th className="pb-3 pr-4">승인</th>
                  <th className="pb-3 pr-4">플랜</th>
                  <th className="pb-3 pr-4">역할</th>
                  <th className="pb-3 pr-4">프로젝트</th>
                  <th className="pb-3">작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium">{u.name || "-"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-3 pr-4">
                      {u.approved ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">승인됨</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApprove(u.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          승인
                        </Button>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Button
                        size="sm"
                        variant={u.plan === "pro" ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => handlePlanToggle(u)}
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        {u.plan === "pro" ? "PRO" : "FREE"}
                      </Button>
                    </td>
                    <td className="py-3 pr-4">
                      <Button
                        size="sm"
                        variant={u.role === "admin" ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => handleRoleToggle(u)}
                      >
                        {u.role === "admin" ? "Admin" : "User"}
                      </Button>
                    </td>
                    <td className="py-3 pr-4 text-center">{u.project_count}</td>
                    <td className="py-3">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(u)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
