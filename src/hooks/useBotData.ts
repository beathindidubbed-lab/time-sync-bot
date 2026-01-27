import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BotStats {
  users: {
    total: number;
    banned: number;
    premium: number;
    recentWeek: number;
  };
  files: {
    total: number;
    totalStorageBytes: number;
  };
}

interface BotUser {
  _id: string;
  user_id: string | number;
  name: string;
  username?: string;
  phone?: string;
  banned: boolean;
  is_premium: boolean;
  joined_date: string;
}

interface BotFile {
  _id: string;
  file_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  caption: string;
  downloads: number;
  created_at: string;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
  description: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useBotStats() {
  return useQuery<BotStats>({
    queryKey: ["bot-stats"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-stats`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch bot stats");
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useBotUsers(page = 1, limit = 20, search = "") {
  return useQuery<{ users: BotUser[]; pagination: Pagination }>({
    queryKey: ["bot-users", page, limit, search],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-users?${params}`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch bot users");
      }
      return response.json();
    },
    staleTime: 30000,
  });
}

export function useBotFiles(page = 1, limit = 20, search = "", fileType = "") {
  return useQuery<{ files: BotFile[]; pagination: Pagination }>({
    queryKey: ["bot-files", page, limit, search, fileType],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (fileType) params.set("type", fileType);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-files?${params}`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch bot files");
      }
      return response.json();
    },
    staleTime: 30000,
  });
}

export function useEnvVars() {
  return useQuery<{ envVars: EnvVar[] }>({
    queryKey: ["env-vars"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-env`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch env vars");
      }
      return response.json();
    },
    staleTime: 60000,
  });
}

export function useCreateEnvVar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (envVar: { 
      key: string; 
      value: string; 
      description?: string; 
      is_secret?: boolean;
      sync_to_render?: boolean;
      render_service_id?: string;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-env`, {
        method: "POST",
        headers,
        body: JSON.stringify(envVar),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create env var");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["env-vars"] });
    },
  });
}

export function useDeleteEnvVar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, render_service_id }: { key: string; render_service_id?: string }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-env`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ key, render_service_id }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete env var");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["env-vars"] });
    },
  });
}

// Helper to format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper to format date
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
