import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { connectDb, getConnectionHint } from "../_shared/db.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default bot settings structure
const DEFAULT_SETTINGS = {
  auto_link: false,
  fsub_mode: true,
  preview: true,
  delete_style: "text",
  auto_delete: true,
  auto_delete_time: 600,
  spam_protection: true,
  spam_limit: 10,
  spam_rate: 60,
  force_subscribe_enabled: true,
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

    // Check if user is authorized (owner or admin)
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

    // Connect to database (auto-detects MongoDB or Postgres)
    const db = await connectDb();

    try {
      if (req.method === "GET") {
        let settings: Record<string, unknown> | null = null;

        if (db.type === "mongodb") {
          const settingsCollection = db.mongo!.db.collection("settings");
          const mongoSettings = await settingsCollection.findOne({ _id: "bot_settings" });
          settings = mongoSettings ?? null;
        } else {
          const sql = db.postgres!;
          const result = await sql`SELECT * FROM settings WHERE id = 'bot_settings' LIMIT 1`.catch(() => []);
          settings = result[0] || null;
        }

        await db.close();

        return new Response(JSON.stringify({
          settings: settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS,
          isOwner,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "PUT") {
        const updates = await req.json();

        if (db.type === "mongodb") {
          const settingsCollection = db.mongo!.db.collection("settings");
          await settingsCollection.updateOne(
            { _id: "bot_settings" },
            { $set: { ...updates, updated_at: new Date() } },
            { upsert: true }
          );
        } else {
          const sql = db.postgres!;
          // For Postgres, we'll update the settings as JSONB
          await sql`
            INSERT INTO settings (id, data, updated_at)
            VALUES ('bot_settings', ${JSON.stringify(updates)}::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE SET 
              data = settings.data || ${JSON.stringify(updates)}::jsonb,
              updated_at = NOW()
          `.catch(async () => {
            // If table structure is different, try simpler update
            await sql`UPDATE settings SET data = ${JSON.stringify(updates)}::jsonb, updated_at = NOW() WHERE id = 'bot_settings'`;
          });
        }

        await db.close();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error("Error managing bot settings:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
