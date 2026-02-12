import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjectsApi,
  getProjectApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  type Project,
  type CreateProjectRequest,
} from "@/api/projects";
import { toast } from "sonner";

export function useProjects() {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: getProjectsApi,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("프로젝트가 생성되었습니다.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "프로젝트 생성에 실패했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      updateProjectApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("프로젝트가 업데이트되었습니다.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "업데이트에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("프로젝트가 삭제되었습니다.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "삭제에 실패했습니다.");
    },
  });

  return {
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useProject(id: string | null) {
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => getProjectApi(id!),
    enabled: !!id,
  });
}
