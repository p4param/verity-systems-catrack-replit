import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateFieldDto, UpdateFieldDto } from "../validations/field-validation";
import { useAuth } from "@/lib/auth/auth-context";

export function useFields(entityId: string) {
  const { fetchWithAuth } = useAuth();

  return useQuery({
    queryKey: ["platform", "entities", entityId, "fields"],
    queryFn: async () => {
      if (!entityId || entityId === "new") return [];
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/fields`);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch fields");
      }
      return res.data;
    },
    enabled: !!entityId && entityId !== "new",
  });
}

export function useCreateField(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: CreateFieldDto) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/fields`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to create field");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "fields"] });
    },
  });
}

export function useUpdateField(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFieldDto }) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/fields/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to update field");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "fields"] });
    },
  });
}

export function useDeleteField(entityId: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();
  
  return useMutation({
    mutationFn: async (fieldId: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${entityId}/fields/${fieldId}`, {
        method: "DELETE",
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to delete field");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "entities", entityId, "fields"] });
    },
  });
}
