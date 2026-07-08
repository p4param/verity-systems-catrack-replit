import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";

export function usePlatformModules() {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["platform-modules"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/platform/modules");
      if (!res.success) throw new Error(res.error?.message || "Failed to load modules");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function usePlatformModule(id: string) {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["platform-module", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetchWithAuth(`/api/platform/modules/${id}`);
      if (!res.success) throw new Error(res.error?.message || "Failed to load module");
      return res.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePlatformModule() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetchWithAuth("/api/platform/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to create module");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
    },
  });
}

export function useUpdatePlatformModule() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetchWithAuth(`/api/platform/modules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to update module");
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-module", variables.id] });
    },
  });
}

export function useDeletePlatformModule() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(`/api/platform/modules/${id}`, {
        method: "DELETE",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to delete module");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
    },
  });
}

export function useNavigation() {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["platform-navigation"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/platform/navigation");
      if (!res.success) throw new Error(res.error?.message || "Failed to load navigation");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useRuntimeModules() {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["platform-runtime-modules"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/platform/modules/runtime");
      if (!res.success) throw new Error(res.error?.message || "Failed to load runtime modules");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useModuleTree() {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["platform-module-tree"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/platform/navigation/tree");
      if (!res.success) throw new Error(res.error?.message || "Failed to load module tree");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useToggleModule() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth("/api/platform/modules/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to toggle module");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-runtime-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-module-tree"] });
      queryClient.invalidateQueries({ queryKey: ["platform-navigation"] });
    },
  });
}

export function useReorderModules() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetchWithAuth("/api/platform/modules/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to reorder modules");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-runtime-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-module-tree"] });
      queryClient.invalidateQueries({ queryKey: ["platform-navigation"] });
    },
  });
}

export function useCloneModule() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newCode }: { id: string; newCode: string }) => {
      const res = await fetchWithAuth("/api/platform/modules/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, newCode }),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to clone module");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-runtime-modules"] });
    },
  });
}

export function useImportModules() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modules: any[]) => {
      const res = await fetchWithAuth("/api/platform/modules/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to import modules");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-runtime-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-module-tree"] });
      queryClient.invalidateQueries({ queryKey: ["platform-navigation"] });
    },
  });
}

export function usePublishRuntime() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth("/api/platform/modules/publish", {
        method: "POST",
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to publish runtime");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-runtime-modules"] });
      queryClient.invalidateQueries({ queryKey: ["platform-module-tree"] });
      queryClient.invalidateQueries({ queryKey: ["platform-navigation"] });
    },
  });
}
