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
  banned_at?: string;
  is_premium: boolean;
  joined_date: string;
  spam_flagged?: boolean;
  spam_count?: number;
}

interface BotUserStats {
  total: number;
  banned: number;
  premium: number;
  active: number;
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

interface BotSettings {
  auto_link: boolean;
  fsub_mode: boolean;
  preview: boolean;
  delete_style: string;
  auto_delete: boolean;
  auto_delete_time: number;
  spam_protection: boolean;
  spam_limit: number;
  spam_rate: number;
  force_subscribe_enabled: boolean;
}

interface AdminPermissions {
  can_broadcast: boolean;
  can_ban: boolean;
  can_genlink: boolean;
  can_batch: boolean;
  can_custom_batch: boolean;
  can_auto_link: boolean;
  can_delete_files: boolean;
  can_view_stats: boolean;
  can_manage_fsub: boolean;
  can_set_delete_time: boolean;
}

interface BotAdmin {
  _id: string;
  user_id: number;
  name: string;
  permissions: AdminPermissions;
  created_at: string;
  updated_at?: string;
}

interface SpamData {
  spamLogs: unknown[];
  flaggedUsers: {
    user_id: number;
    name: string;
    username?: string;
    spam_count: number;
    last_spam?: string;
    banned: boolean;
  }[];
  highActivityUsers: {
    user_id: number;
    name: string;
    message_count: number;
    last_active?: string;
  }[];
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

// ============ BOT STATS ============
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
    staleTime: 30000,
  });
}

// ============ BOT USERS ============
export function useBotUsers(page = 1, limit = 20, search = "", filter = "all") {
  return useQuery<{ users: BotUser[]; stats: BotUserStats; pagination: Pagination }>({
    queryKey: ["bot-users", page, limit, search, filter],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: String(limit),
        filter 
      });
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

export function useBanUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, action }: { userId: number | string; action: "ban" | "unban" }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-users`, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId, action }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} user`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-users"] });
      queryClient.invalidateQueries({ queryKey: ["bot-stats"] });
    },
  });
}

// ============ BOT FILES ============
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

// ============ ENV VARS ============
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

// ============ BOT SETTINGS ============
export function useBotSettings() {
  return useQuery<{ settings: BotSettings; isOwner: boolean }>({
    queryKey: ["bot-settings"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-settings`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch bot settings");
      }
      return response.json();
    },
    staleTime: 30000,
  });
}

export function useUpdateBotSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<BotSettings>) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update bot settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-settings"] });
    },
  });
}

// ============ BOT ADMINS ============
export function useBotAdmins() {
  return useQuery<{ admins: BotAdmin[]; defaultPermissions: AdminPermissions }>({
    queryKey: ["bot-admins"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-admins`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch bot admins");
      }
      return response.json();
    },
    staleTime: 30000,
  });
}

export function useAddBotAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (admin: { user_id: number; name?: string; permissions?: Partial<AdminPermissions> }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-admins`, {
        method: "POST",
        headers,
        body: JSON.stringify(admin),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add bot admin");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-admins"] });
    },
  });
}

export function useUpdateBotAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, permissions, name }: { userId: number; permissions?: AdminPermissions; name?: string }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-admins`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ user_id: userId, permissions, name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update bot admin");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-admins"] });
    },
  });
}

export function useRemoveBotAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: number) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-admins`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ user_id: userId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove bot admin");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-admins"] });
    },
  });
}

// ============ SPAM MONITOR ============
export function useSpamData(page = 1, limit = 20) {
  return useQuery<SpamData & { pagination: Pagination }>({
    queryKey: ["bot-spam", page, limit],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-spam?${params}`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch spam data");
      }
      return response.json();
    },
    staleTime: 15000, // Refresh more often for spam monitoring
  });
}

export function useClearSpamFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: number) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-spam`, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId, action: "clear_flag" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clear spam flag");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-spam"] });
      queryClient.invalidateQueries({ queryKey: ["bot-users"] });
    },
  });
}

// ============ BOT STATUS ============
interface BotStatusData {
  status: "online" | "offline" | "maintenance";
  uptime: string;
  version: string;
  started_at?: string;
  last_heartbeat?: string;
  response_time_ms?: number;
}

export function useBotStatus() {
  return useQuery<BotStatusData>({
    queryKey: ["bot-status"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-status`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch bot status");
      }
      return response.json();
    },
    staleTime: 15000, // Refresh every 15 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });
}

// ============ FORCE SUBSCRIBE CHANNELS ============
interface FsubChannel {
  _id: string;
  channel_id: number;
  channel_name: string;
  channel_username?: string;
  added_at?: string;
  added_by?: string;
}

export function useFsubChannels() {
  return useQuery<{ channels: FsubChannel[]; fsub_enabled: boolean }>({
    queryKey: ["fsub-channels"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-fsub`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch fsub channels");
      }
      return response.json();
    },
    staleTime: 30000,
  });
}

export function useAddFsubChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channel: { channel_id: number | string; channel_name?: string; channel_username?: string }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-fsub`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "add", ...channel }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add channel");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fsub-channels"] });
    },
  });
}

export function useRemoveFsubChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (channelId: number) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-fsub`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "remove", channel_id: channelId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove channel");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fsub-channels"] });
    },
  });
}

export function useToggleFsubMode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-fsub`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "toggle" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to toggle fsub mode");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fsub-channels"] });
      queryClient.invalidateQueries({ queryKey: ["bot-settings"] });
    },
  });
}

// ============ BROADCAST ============
interface Broadcast {
  _id: string;
  message: string;
  type: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  total_users: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at?: string;
  created_by: string;
  options: {
    pin: boolean;
    delete_after: number | null;
    forward: boolean;
  };
}

export function useBroadcasts(page = 1, limit = 20) {
  return useQuery<{ broadcasts: Broadcast[]; total_active_users: number; pagination: Pagination }>({
    queryKey: ["broadcasts", page, limit],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-broadcast?${params}`, { headers });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch broadcasts");
      }
      return response.json();
    },
    staleTime: 15000,
    refetchInterval: 30000, // Auto-refresh for status updates
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (broadcast: { 
      message: string; 
      type?: string; 
      options?: { pin?: boolean; delete_after?: number | null; forward?: boolean } 
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-broadcast`, {
        method: "POST",
        headers,
        body: JSON.stringify(broadcast),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create broadcast");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    },
  });
}

export function useCancelBroadcast() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (broadcastId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/bot-broadcast?id=${broadcastId}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel broadcast");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    },
  });
}

// ============ HELPERS ============
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

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

export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
