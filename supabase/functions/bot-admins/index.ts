import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { connectDb, getConnectionHint } from "../_shared/db.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default admin permissions
const DEFAULT_PERMISSIONS = {
  can_broadcast: true,
  can_ban: true,
  can_genlink: true,
  can_batch: true,
  can_custom_batch: true,
  can_auto_link: false,
  can_delete_files: false,
  can_view_stats: true,
  can_manage_fsub: false,
  can_set_delete_time: false,
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

    // Check if user is owner (only owners can manage admins)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData?.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only owners can manage bot admins" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Connect to database (auto-detects MongoDB or Postgres)
    const db = await connectDb();

    try {
      if (req.method === "GET") {
        let admins: Record<string, unknown>[] = [];

        if (db.type === "mongodb") {
          const adminsCollection = db.mongo!.db.collection("admins");
          admins = await adminsCollection.find().toArray();
        } else {
          const sql = db.postgres!;
          admins = await sql`SELECT * FROM admins ORDER BY created_at DESC`.catch(() => []);
        }

        await db.close();

        // Add default permissions to any admin missing them
        const adminsWithPermissions = admins.map((admin) => ({
          ...admin,
          permissions: { ...DEFAULT_PERMISSIONS, ...((admin.permissions as Record<string, unknown>) || {}) },
        }));

        return new Response(JSON.stringify({
          admins: adminsWithPermissions,
          defaultPermissions: DEFAULT_PERMISSIONS,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "POST") {
        const { user_id: targetUserId, name, permissions } = await req.json();

        if (db.type === "mongodb") {
          const adminsCollection = db.mongo!.db.collection("admins");

          // Check if admin already exists
          const existing = await adminsCollection.findOne({ user_id: Number(targetUserId) });
          if (existing) {
            await db.close();
            return new Response(JSON.stringify({ error: "Admin already exists" }), { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          await adminsCollection.insertOne({
            user_id: Number(targetUserId),
            name: name || `Admin ${targetUserId}`,
            permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
            created_at: new Date(),
          });
        } else {
          const sql = db.postgres!;

          // Check if admin already exists
          const existing = await sql`SELECT 1 FROM admins WHERE user_id = ${Number(targetUserId)} LIMIT 1`;
          if (existing.length > 0) {
            await db.close();
            return new Response(JSON.stringify({ error: "Admin already exists" }), { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          await sql`
            INSERT INTO admins (user_id, name, permissions, created_at)
            VALUES (${Number(targetUserId)}, ${name || `Admin ${targetUserId}`}, ${JSON.stringify({ ...DEFAULT_PERMISSIONS, ...permissions })}::jsonb, NOW())
          `;
        }

        await db.close();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "PUT") {
        const { user_id: targetUserId, permissions, name } = await req.json();

        if (db.type === "mongodb") {
          const adminsCollection = db.mongo!.db.collection("admins");

          const updateData: Record<string, unknown> = { updated_at: new Date() };
          if (permissions) updateData.permissions = permissions;
          if (name) updateData.name = name;

          await adminsCollection.updateOne(
            { user_id: Number(targetUserId) },
            { $set: updateData }
          );
        } else {
          const sql = db.postgres!;

          if (permissions && name) {
            await sql`UPDATE admins SET permissions = ${JSON.stringify(permissions)}::jsonb, name = ${name}, updated_at = NOW() WHERE user_id = ${Number(targetUserId)}`;
          } else if (permissions) {
            await sql`UPDATE admins SET permissions = ${JSON.stringify(permissions)}::jsonb, updated_at = NOW() WHERE user_id = ${Number(targetUserId)}`;
          } else if (name) {
            await sql`UPDATE admins SET name = ${name}, updated_at = NOW() WHERE user_id = ${Number(targetUserId)}`;
          }
        }

        await db.close();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "DELETE") {
        const { user_id: targetUserId } = await req.json();

        if (db.type === "mongodb") {
          const adminsCollection = db.mongo!.db.collection("admins");
          await adminsCollection.deleteOne({ user_id: Number(targetUserId) });
        } else {
          const sql = db.postgres!;
          await sql`DELETE FROM admins WHERE user_id = ${Number(targetUserId)}`;
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
    console.error("Error managing bot admins:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
