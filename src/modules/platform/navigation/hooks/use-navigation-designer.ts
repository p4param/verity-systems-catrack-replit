import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getNavigationDesignerTree,
  getNavigationProfiles,
  saveNavigationGroup,
  updateNavigationGroup,
  deleteNavigationGroup,
  saveNavigationItem,
  updateNavigationItem,
  deleteNavigationItem,
  moveNavigation,
  publishNavigation,
  restoreNavigationVersion,
  getVersionsList,
  getHistoryLogs
} from "../actions/navigation-actions";

export function useNavigationTree() {
  return useQuery({
    queryKey: ["navigation-tree"],
    queryFn: async () => {
      return getNavigationDesignerTree();
    },
    staleTime: 30_000
  });
}

export function useNavigationProfiles() {
  return useQuery({
    queryKey: ["navigation-profiles"],
    queryFn: async () => {
      return getNavigationProfiles();
    }
  });
}

export function useSidebar() {
  const { fetchWithAuth } = useAuth();
  return useQuery({
    queryKey: ["navigation-sidebar"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/platform/navigation/sidebar");
      if (!res.success) throw new Error(res.error?.message || "Failed to load sidebar");
      return res.data;
    },
    staleTime: 30_000
  });
}

export function usePublishNavigation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, tenantId, actorUserId }: { profileId: string; tenantId: string; actorUserId: string }) => {
      return publishNavigation(profileId, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
      queryClient.invalidateQueries({ queryKey: ["navigation-sidebar"] });
      queryClient.invalidateQueries({ queryKey: ["navigation-versions"] });
      queryClient.invalidateQueries({ queryKey: ["navigation-history"] });
    }
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, tenantId, actorUserId }: { data: any; tenantId: string; actorUserId: string }) => {
      return saveNavigationGroup(data, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
    }
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, tenantId, actorUserId }: { id: string; data: any; tenantId: string; actorUserId: string }) => {
      return updateNavigationGroup(id, data, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
    }
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenantId, actorUserId }: { id: string; tenantId: string; actorUserId: string }) => {
      return deleteNavigationGroup(id, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
    }
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, tenantId, actorUserId }: { data: any; tenantId: string; actorUserId: string }) => {
      return saveNavigationItem(data, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
    }
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, tenantId, actorUserId }: { id: string; data: any; tenantId: string; actorUserId: string }) => {
      return updateNavigationItem(id, data, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
    }
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenantId, actorUserId }: { id: string; tenantId: string; actorUserId: string }) => {
      return deleteNavigationItem(id, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
    }
  });
}

export function useMoveNavigationItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, parentId, displayOrder, tenantId, actorUserId }: { itemId: string; parentId: string | null; displayOrder: number; tenantId: string; actorUserId: string }) => {
      return moveNavigation(itemId, parentId, displayOrder, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
    }
  });
}

export function useNavigationVersions() {
  return useQuery({
    queryKey: ["navigation-versions"],
    queryFn: async () => {
      return getVersionsList();
    }
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ versionId, tenantId, actorUserId }: { versionId: string; tenantId: string; actorUserId: string }) => {
      return restoreNavigationVersion(versionId, tenantId, actorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navigation-tree"] });
      queryClient.invalidateQueries({ queryKey: ["navigation-sidebar"] });
    }
  });
}

export function useHistoryLogs() {
  return useQuery({
    queryKey: ["navigation-history"],
    queryFn: async () => {
      return getHistoryLogs();
    }
  });
}
