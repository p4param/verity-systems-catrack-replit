import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateLayoutDto, UpdateLayoutDto } from "../validations/layout-validation";
import { useAuth } from "@/lib/auth/auth-context";

export function useLayouts(entityId: string) {
  const { fetchWithAuth } = useAuth();

  return useQuery({
    queryKey: ["platform", "entities", entityId, "layouts"],
    queryFn: async () => {
      if (!entityId || entityId === "new") return [];
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/layouts`);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch layouts");
      }
      return res.data;
    },
    enabled: !!entityId && entityId !== "new",
  });
}

export function useLayout(entityId: string, layoutId: string) {
  const { fetchWithAuth } = useAuth();

  return useQuery({
    queryKey: ["platform", "entities", entityId, "layouts", layoutId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/layouts/${layoutId}`);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch layout");
      }
      return res.data;
    },
    enabled: !!entityId && !!layoutId && entityId !== "new",
  });
}

export function useCreateLayout(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: CreateLayoutDto) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/layouts`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to create layout");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "layouts"] });
    },
  });
}

export function useUpdateLayout(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLayoutDto }) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/layouts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to update layout");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "layouts"] });
    },
  });
}

export function useDeleteLayout(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async (layoutId: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/layouts/${layoutId}`, {
        method: "DELETE",
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to delete layout");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "layouts"] });
    },
  });
}
