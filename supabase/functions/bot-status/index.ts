import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { connectDb, getConnectionHint } from "../_shared/db.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Connect to database (auto-detects MongoDB or Postgres)
    const db = await connectDb();

    try {
      let botStatus: Record<string, unknown> | null = null;

      if (db.type === "mongodb") {
        const settingsCollection = db.mongo!.db.collection("settings");
        const statusCollection = db.mongo!.db.collection("bot_status");

        // Try to get status from bot_status collection first, then settings
        const mongoStatus = await statusCollection.findOne({ _id: "status" });
        botStatus = mongoStatus ?? null;

        if (!botStatus) {
          const settings = await settingsCollection.findOne({ _id: "bot_settings" });
          botStatus = {
            online: true,
            version: settings?.version || "4.0.0",
            started_at: settings?.started_at || null,
            last_heartbeat: settings?.last_heartbeat || null,
          };
        }
      } else {
        // PostgreSQL
        const sql = db.postgres!;

        // Try bot_status table first
        const statusResult = await sql`SELECT * FROM bot_status WHERE id = 'status' LIMIT 1`.catch(() => []);

        if (statusResult.length > 0) {
          botStatus = statusResult[0];
        } else {
          // Fallback to settings
          const settingsResult = await sql`SELECT * FROM settings WHERE id = 'bot_settings' LIMIT 1`.catch(() => []);
          const settings = settingsResult[0];
          botStatus = {
            online: true,
            version: settings?.version || "4.0.0",
            started_at: settings?.started_at || null,
            last_heartbeat: settings?.last_heartbeat || null,
          };
        }
      }

      // Calculate uptime if started_at is available
      let uptime = "Unknown";
      if (botStatus?.started_at) {
        const startedAt = new Date(botStatus.started_at as string);
        const now = new Date();
        const diff = now.getTime() - startedAt.getTime();

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        uptime = `${days}d ${hours}h ${minutes}m`;
      }

      // Check if bot is online based on last heartbeat (within last 2 minutes)
      let status: "online" | "offline" | "maintenance" = "offline";
      if (botStatus?.last_heartbeat) {
        const lastHeartbeat = new Date(botStatus.last_heartbeat as string);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60);

        if (diffMinutes < 2) {
          status = botStatus.maintenance ? "maintenance" : "online";
        }
      } else if (botStatus?.online) {
        status = "online";
      }

      await db.close();

      return new Response(JSON.stringify({
        status,
        uptime,
        version: botStatus?.version || "4.0.0",
        started_at: botStatus?.started_at,
        last_heartbeat: botStatus?.last_heartbeat,
        response_time_ms: botStatus?.response_time_ms || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await db.close();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error fetching bot status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
