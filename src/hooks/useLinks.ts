import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BotLink {
  id: string;
  name: string;
  bot_link: string;
  category_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  first_msg_id: number | null;
  last_msg_id: number | null;
  link_type: "single" | "batch" | "custom_batch";
  is_active: boolean;
  click_count: number;
  shared_with: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: LinkCategory;
}

export interface LinkCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string | null;
  user_id: string | null;
  user_name: string | null;
  link_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============ CATEGORIES ============
export function useLinkCategories() {
  return useQuery<LinkCategory[]>({
    queryKey: ["link-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("link_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as LinkCategory[];
    },
    staleTime: 60000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: { name: string; color?: string }) => {
      const { data, error } = await (supabase as any)
        .from("link_categories")
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-categories"] });
      queryClient.invalidateQueries({ queryKey: ["link-stats"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { data, error } = await (supabase as any)
        .from("link_categories")
        .update({ name, color })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-categories"] });
      queryClient.invalidateQueries({ queryKey: ["bot-links"] });
      queryClient.invalidateQueries({ queryKey: ["link-stats"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Unlink all links from this category first
      await (supabase as any)
        .from("bot_links")
        .update({ category_id: null })
        .eq("category_id", id);

      const { error } = await (supabase as any)
        .from("link_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-categories"] });
      queryClient.invalidateQueries({ queryKey: ["bot-links"] });
      queryClient.invalidateQueries({ queryKey: ["link-stats"] });
    },
  });
}

// ============ LINKS ============
export function useBotLinks(page = 1, limit = 20, search = "", categoryId = "") {
  return useQuery({
    queryKey: ["bot-links", page, limit, search, categoryId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("bot_links")
        .select("*, link_categories(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,bot_link.ilike.%${search}%,notes.ilike.%${search}%`);
      }
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        links: (data || []).map((d: any) => ({
          ...d,
          category: d.link_categories,
        })) as BotLink[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    },
    staleTime: 15000,
  });
}

export function useLinkStats() {
  return useQuery({
    queryKey: ["link-stats"],
    queryFn: async () => {
      const [totalResult, activeResult, categoriesResult] = await Promise.all([
        (supabase as any).from("bot_links").select("*", { count: "exact", head: true }),
        (supabase as any).from("bot_links").select("*", { count: "exact", head: true }).eq("is_active", true),
        (supabase as any).from("bot_links").select("category_id, link_categories(name, color)"),
      ]);

      const categoryMap = new Map<string, { name: string; color: string; count: number }>();
      if (categoriesResult.data) {
        for (const link of categoriesResult.data as any[]) {
          const cat = link.link_categories;
          if (cat) {
            const existing = categoryMap.get(cat.name) || { name: cat.name, color: cat.color, count: 0 };
            existing.count++;
            categoryMap.set(cat.name, existing);
          }
        }
      }

      return {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        byCategory: Array.from(categoryMap.values()),
      };
    },
    staleTime: 30000,
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (link: {
      name: string;
      bot_link: string;
      category_id?: string;
      link_type?: string;
      first_msg_id?: number;
      last_msg_id?: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("bot_links")
        .insert({
          name: link.name,
          bot_link: link.bot_link,
          category_id: link.category_id || null,
          link_type: link.link_type || "single",
          first_msg_id: link.first_msg_id || null,
          last_msg_id: link.last_msg_id || null,
          notes: link.notes || null,
          created_by: user.id,
          created_by_name: user.email?.split("@")[0] || "Admin",
        })
        .select()
        .single();
      if (error) throw error;

      // Log activity
      await (supabase as any).from("activity_log").insert({
        action: "link_created",
        description: `Created link "${link.name}"`,
        user_id: user.id,
        user_name: user.email?.split("@")[0] || "Admin",
        link_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-links"] });
      queryClient.invalidateQueries({ queryKey: ["link-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
    },
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: link } = await (supabase as any)
        .from("bot_links")
        .select("name")
        .eq("id", linkId)
        .single();

      const { error } = await (supabase as any)
        .from("bot_links")
        .delete()
        .eq("id", linkId);
      if (error) throw error;

      if (user) {
        await (supabase as any).from("activity_log").insert({
          action: "link_deleted",
          description: `Deleted link "${link?.name || linkId}"`,
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "Admin",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-links"] });
      queryClient.invalidateQueries({ queryKey: ["link-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
    },
  });
}

export function useToggleLinkActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, isActive }: { linkId: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("bot_links")
        .update({ is_active: isActive })
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-links"] });
      queryClient.invalidateQueries({ queryKey: ["link-stats"] });
    },
  });
}

// ============ ACTIVITY LOG ============
export function useActivityLog(limit = 10) {
  return useQuery<ActivityLogEntry[]>({
    queryKey: ["activity-log", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ActivityLogEntry[];
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

// ============ STORAGE STATS ============
export function useStorageStats() {
  return useQuery({
    queryKey: ["storage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_stats")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as {
        used_storage_bytes: number;
        total_storage_bytes: number;
        file_count: number;
      } | null;
    },
    staleTime: 60000,
  });
}
