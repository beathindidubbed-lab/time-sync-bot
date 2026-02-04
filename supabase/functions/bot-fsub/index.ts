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

    const userId = claimsData.claims.sub;

    // Check if user is authorized
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const isAuthorized = roleData?.role === "owner" || roleData?.role === "admin";

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Connect to database (auto-detects MongoDB or Postgres)
    const db = await connectDb();

    try {
      if (req.method === "GET") {
        let channels: Record<string, unknown>[] = [];
        let fsubEnabled = true;

        if (db.type === "mongodb") {
          const fsubCollection = db.mongo!.db.collection("fsub_channels");
          const settingsCollection = db.mongo!.db.collection("settings");

          channels = await fsubCollection.find({}).toArray();
          const settings = await settingsCollection.findOne({ _id: "bot_settings" });
          fsubEnabled = settings?.fsub_mode ?? true;
        } else {
          const sql = db.postgres!;

          channels = await sql`SELECT * FROM fsub_channels ORDER BY added_at DESC`.catch(() => []);
          const settingsResult = await sql`SELECT * FROM settings WHERE id = 'bot_settings' LIMIT 1`.catch(() => []);
          const settings = settingsResult[0];
          fsubEnabled = settings?.fsub_mode ?? settings?.data?.fsub_mode ?? true;
        }

        await db.close();

        return new Response(JSON.stringify({
          channels: channels.map((ch) => ({
            _id: ch._id?.toString() || ch.id,
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
          if (!channel_id) {
            await db.close();
            return new Response(JSON.stringify({ error: "Channel ID is required" }), { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          if (db.type === "mongodb") {
            const fsubCollection = db.mongo!.db.collection("fsub_channels");

            const existing = await fsubCollection.findOne({ channel_id: Number(channel_id) });
            if (existing) {
              await db.close();
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
          } else {
            const sql = db.postgres!;

            const existing = await sql`SELECT 1 FROM fsub_channels WHERE channel_id = ${Number(channel_id)} LIMIT 1`;
            if (existing.length > 0) {
              await db.close();
              return new Response(JSON.stringify({ error: "Channel already added" }), { 
                status: 400, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              });
            }

            await sql`
              INSERT INTO fsub_channels (channel_id, channel_name, channel_username, added_at, added_by)
              VALUES (${Number(channel_id)}, ${channel_name || "Unknown"}, ${channel_username || null}, NOW(), ${userId})
            `;
          }

          await db.close();

          return new Response(JSON.stringify({ success: true, message: "Channel added" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (action === "remove") {
          if (!channel_id) {
            await db.close();
            return new Response(JSON.stringify({ error: "Channel ID is required" }), { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          if (db.type === "mongodb") {
            const fsubCollection = db.mongo!.db.collection("fsub_channels");
            await fsubCollection.deleteOne({ channel_id: Number(channel_id) });
          } else {
            const sql = db.postgres!;
            await sql`DELETE FROM fsub_channels WHERE channel_id = ${Number(channel_id)}`;
          }

          await db.close();

          return new Response(JSON.stringify({ success: true, message: "Channel removed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (action === "toggle") {
          let newStatus = true;

          if (db.type === "mongodb") {
            const settingsCollection = db.mongo!.db.collection("settings");
            const settings = await settingsCollection.findOne({ _id: "bot_settings" });
            const currentStatus = settings?.fsub_mode ?? true;
            newStatus = !currentStatus;

            await settingsCollection.updateOne(
              { _id: "bot_settings" },
              { $set: { fsub_mode: newStatus, updated_at: new Date() } },
              { upsert: true }
            );
          } else {
            const sql = db.postgres!;
            const settingsResult = await sql`SELECT * FROM settings WHERE id = 'bot_settings' LIMIT 1`.catch(() => []);
            const currentStatus = settingsResult[0]?.fsub_mode ?? settingsResult[0]?.data?.fsub_mode ?? true;
            newStatus = !currentStatus;

            await sql`
              INSERT INTO settings (id, fsub_mode, updated_at)
              VALUES ('bot_settings', ${newStatus}, NOW())
              ON CONFLICT (id) DO UPDATE SET fsub_mode = ${newStatus}, updated_at = NOW()
            `.catch(async () => {
              await sql`UPDATE settings SET data = jsonb_set(COALESCE(data, '{}'), '{fsub_mode}', ${JSON.stringify(newStatus)}), updated_at = NOW() WHERE id = 'bot_settings'`;
            });
          }

          await db.close();

          return new Response(JSON.stringify({ 
            success: true, 
            fsub_enabled: newStatus,
            message: `Force subscribe ${newStatus ? "enabled" : "disabled"}` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await db.close();
        return new Response(JSON.stringify({ error: "Invalid action" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      await db.close();
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await db.close();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error managing fsub channels:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
