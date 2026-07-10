import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateViewDto, UpdateViewDto } from "../validations/view-validation";
import { useAuth } from "@/lib/auth/auth-context";

export function useViews(entityId: string) {
  const { fetchWithAuth } = useAuth();

  return useQuery({
    queryKey: ["platform", "entities", entityId, "views"],
    queryFn: async () => {
      if (!entityId || entityId === "new") return [];
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/views`);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch views");
      }
      return res.data;
    },
    enabled: !!entityId && entityId !== "new",
  });
}

export function useCreateView(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: CreateViewDto) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/views`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to create view");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "views"] });
    },
  });
}

export function useUpdateView(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateViewDto }) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/views/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to update view");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "views"] });
    },
  });
}

export function useDeleteView(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async (viewId: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/views/${viewId}`, {
        method: "DELETE",
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to delete view");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "views"] });
    },
  });
}
