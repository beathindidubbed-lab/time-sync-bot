import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // Check if user is owner
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData?.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only owners can manage env vars" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const renderApiKey = Deno.env.get("RENDER_API_KEY");

    if (req.method === "GET") {
      // Get env vars from database
      const { data: envVars, error } = await supabase
        .from("bot_env_vars")
        .select("*")
        .order("key");

      if (error) throw error;

      return new Response(JSON.stringify({ envVars }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { key, value, description, is_secret, sync_to_render, render_service_id } = await req.json();

      // Insert/update in database
      const { data, error } = await supabase
        .from("bot_env_vars")
        .upsert({ key, value: is_secret ? "***HIDDEN***" : value, description, is_secret })
        .select()
        .single();

      if (error) throw error;

      // Sync to Render if requested
      if (sync_to_render && renderApiKey && render_service_id) {
        try {
          const renderResponse = await fetch(
            `https://api.render.com/v1/services/${render_service_id}/env-vars/${key}`,
            {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${renderApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ value }),
            }
          );

          if (!renderResponse.ok) {
            // Try creating new env var instead
            await fetch(
              `https://api.render.com/v1/services/${render_service_id}/env-vars`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${renderApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify([{ key, value }]),
              }
            );
          }
        } catch (renderError) {
          console.error("Failed to sync to Render:", renderError);
        }
      }

      return new Response(JSON.stringify({ success: true, envVar: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const { key, render_service_id } = await req.json();

      // Delete from database
      const { error } = await supabase
        .from("bot_env_vars")
        .delete()
        .eq("key", key);

      if (error) throw error;

      // Delete from Render if API key exists
      if (renderApiKey && render_service_id) {
        try {
          await fetch(
            `https://api.render.com/v1/services/${render_service_id}/env-vars/${key}`,
            {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${renderApiKey}`,
              },
            }
          );
        } catch (renderError) {
          console.error("Failed to delete from Render:", renderError);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error managing env vars:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
