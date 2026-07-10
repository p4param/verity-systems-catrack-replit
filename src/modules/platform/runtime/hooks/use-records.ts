import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export function useRecords(moduleCode: string, entityCode: string, options: any = {}) {
  const { fetchWithAuth } = useAuth();

  return useQuery({
    queryKey: ["runtime", moduleCode, entityCode, options],
    queryFn: async () => {
      const query = new URLSearchParams(options).toString();
      const data = await fetchWithAuth(`/api/runtime/${moduleCode}/${entityCode}?${query}`);
      // The backend returns an array if successful. If error, fetchWithAuth throws.
      // Wait! Does the backend wrap in success/data? No, we return records array directly in route.ts.
      // But if it does, handle both:
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) throw new Error(data.error?.message || data.error?.error || "Failed to fetch records");
        return data.data;
      }
      return data;
    },
  });
}

export function useRecord(moduleCode: string, entityCode: string, id: string) {
  const { fetchWithAuth } = useAuth();

  return useQuery({
    queryKey: ["runtime", moduleCode, entityCode, id],
    queryFn: async () => {
      const data = await fetchWithAuth(`/api/runtime/${moduleCode}/${entityCode}/${id}`);
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) throw new Error(data.error?.message || data.error?.error || "Failed to fetch record");
        return data.data;
      }
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateRecord(moduleCode: string, entityCode: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { fetchWithAuth } = useAuth();

  return useMutation({
    mutationFn: async (payload: any) => {
      const data = await fetchWithAuth(`/api/runtime/${moduleCode}/${entityCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) throw new Error(data.error?.message || data.error?.error || "Failed to create record");
        return data.data;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runtime", moduleCode, entityCode] });
      router.push(`/runtime/${moduleCode}/${entityCode}`);
    },
  });
}

export function useUpdateRecord(moduleCode: string, entityCode: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();

  return useMutation({
    mutationFn: async (payload: any) => {
      const data = await fetchWithAuth(`/api/runtime/${moduleCode}/${entityCode}/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      });
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) throw new Error(data.error?.message || data.error?.error || "Failed to update record");
        return data.data;
      }
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["runtime", moduleCode, entityCode] });
      queryClient.invalidateQueries({ queryKey: ["runtime", moduleCode, entityCode, variables.id] });
    },
  });
}

export function useDeleteRecord(moduleCode: string, entityCode: string) {
  const queryClient = useQueryClient();
  const { fetchWithAuth } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await fetchWithAuth(`/api/runtime/${moduleCode}/${entityCode}/${id}`, {
        method: "DELETE",
      });
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) throw new Error(data.error?.message || data.error?.error || "Failed to delete record");
        return data.data;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runtime", moduleCode, entityCode] });
    },
  });
}
