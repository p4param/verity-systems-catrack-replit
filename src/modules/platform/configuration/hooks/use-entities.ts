import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";

export function useEntities() {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/platform/entities");
      if (!res.success) throw new Error(res.error?.message || "Failed to load entities");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useEntity(id: string) {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["entity", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetchWithAuth(`/api/platform/entities/${id}`);
      if (!res.success) throw new Error(res.error?.message || "Failed to load entity");
      return res.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateEntity() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetchWithAuth("/api/platform/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to create entity");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useUpdateEntity() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetchWithAuth(`/api/platform/entities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to update entity");
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity", variables.id] });
    },
  });
}

export function useDeleteEntity() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${id}`, {
        method: "DELETE",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to delete entity");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useArchiveEntity() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${id}/archive`, {
        method: "POST",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to archive entity");
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity", id] });
    },
  });
}

export function useRestoreEntity() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${id}/restore`, {
        method: "POST",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to restore entity");
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity", id] });
    },
  });
}

export function useDuplicateEntity() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${id}/duplicate`, {
        method: "POST",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to duplicate entity");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useValidatePublishEntity() {
  const { fetchWithAuth } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${id}/validate-publish`, {
        method: "POST",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to validate publish");
      return res.data;
    },
  });
}

export function usePublishEntity() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/platform/entities/${id}/publish`, {
        method: "POST",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to publish entity");
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity", id] });
    },
  });
}
