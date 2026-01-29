import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

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

    // Connect to MongoDB
    const mongoUri = Deno.env.get("MONGODB_URI");
    if (!mongoUri) {
      return new Response(JSON.stringify({ error: "MongoDB not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const client = new MongoClient();
    await client.connect(mongoUri);
    
    const db = client.database();
    
    // Get bot status from settings or a dedicated status collection
    const settingsCollection = db.collection("settings");
    const statusCollection = db.collection("bot_status");
    
    // Try to get status from bot_status collection first, then settings
    let botStatus = await statusCollection.findOne({ _id: "status" });
    
    if (!botStatus) {
      // Fallback to settings collection
      const settings = await settingsCollection.findOne({ _id: "bot_settings" });
      botStatus = {
        online: true, // Assume online if bot is responding
        version: settings?.version || "4.0.0",
        started_at: settings?.started_at || null,
        last_heartbeat: settings?.last_heartbeat || null,
      };
    }

    // Calculate uptime if started_at is available
    let uptime = "Unknown";
    if (botStatus.started_at) {
      const startedAt = new Date(botStatus.started_at);
      const now = new Date();
      const diff = now.getTime() - startedAt.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      uptime = `${days}d ${hours}h ${minutes}m`;
    }

    // Check if bot is online based on last heartbeat (within last 2 minutes)
    let status: "online" | "offline" | "maintenance" = "offline";
    if (botStatus.last_heartbeat) {
      const lastHeartbeat = new Date(botStatus.last_heartbeat);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60);
      
      if (diffMinutes < 2) {
        status = botStatus.maintenance ? "maintenance" : "online";
      }
    } else if (botStatus.online) {
      status = "online";
    }

    await client.close();

    return new Response(JSON.stringify({
      status,
      uptime,
      version: botStatus.version || "4.0.0",
      started_at: botStatus.started_at,
      last_heartbeat: botStatus.last_heartbeat,
      response_time_ms: botStatus.response_time_ms || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching bot status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
