import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { MongoClient, ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
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

    const userId = claimsData.claims.sub;

    // Check if user is authorized (owner or admin with can_manage_fsub permission)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const isOwner = roleData?.role === "owner";
    const isAuthorized = roleData?.role === "owner" || roleData?.role === "admin";

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 403, 
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
    const fsubCollection = db.collection("fsub_channels");
    const settingsCollection = db.collection("settings");

    if (req.method === "GET") {
      // Get all force subscribe channels
      const channels = await fsubCollection.find({}).toArray();
      
      // Get fsub mode status
      const settings = await settingsCollection.findOne({ _id: "bot_settings" });
      const fsubEnabled = settings?.fsub_mode ?? true;

      await client.close();

      return new Response(JSON.stringify({
        channels: channels.map(ch => ({
          _id: ch._id.toString(),
          channel_id: ch.channel_id,
          channel_name: ch.channel_name || ch.title || "Unknown",
          channel_username: ch.channel_username || ch.username,
          added_at: ch.added_at || ch.created_at,
          added_by: ch.added_by,
        })),
        fsub_enabled: fsubEnabled,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { action, channel_id, channel_name, channel_username } = await req.json();
      
      if (action === "add") {
        // Add a new force subscribe channel
        if (!channel_id) {
          await client.close();
          return new Response(JSON.stringify({ error: "Channel ID is required" }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        // Check if channel already exists
        const existing = await fsubCollection.findOne({ channel_id: Number(channel_id) });
        if (existing) {
          await client.close();
          return new Response(JSON.stringify({ error: "Channel already added" }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        await fsubCollection.insertOne({
          channel_id: Number(channel_id),
          channel_name: channel_name || "Unknown",
          channel_username: channel_username || null,
          added_at: new Date(),
          added_by: userId,
        });

        await client.close();

        return new Response(JSON.stringify({ success: true, message: "Channel added" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "remove") {
        if (!channel_id) {
          await client.close();
          return new Response(JSON.stringify({ error: "Channel ID is required" }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        await fsubCollection.deleteOne({ channel_id: Number(channel_id) });

        await client.close();

        return new Response(JSON.stringify({ success: true, message: "Channel removed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "toggle") {
        // Toggle fsub mode
        const settings = await settingsCollection.findOne({ _id: "bot_settings" });
        const currentStatus = settings?.fsub_mode ?? true;

        await settingsCollection.updateOne(
          { _id: "bot_settings" },
          { $set: { fsub_mode: !currentStatus, updated_at: new Date() } },
          { upsert: true }
        );

        await client.close();

        return new Response(JSON.stringify({ 
          success: true, 
          fsub_enabled: !currentStatus,
          message: `Force subscribe ${!currentStatus ? "enabled" : "disabled"}` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await client.close();
      return new Response(JSON.stringify({ error: "Invalid action" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    await client.close();
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error managing fsub channels:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
