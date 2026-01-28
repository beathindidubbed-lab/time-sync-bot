import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { MongoClient, ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

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
    const adminsCollection = db.collection("admins");

    if (req.method === "GET") {
      // Get all admins
      const admins = await adminsCollection.find().toArray();
      
      await client.close();

      // Add default permissions to any admin missing them
      const adminsWithPermissions = admins.map(admin => ({
        ...admin,
        permissions: { ...DEFAULT_PERMISSIONS, ...admin.permissions },
      }));

      return new Response(JSON.stringify({
        admins: adminsWithPermissions,
        defaultPermissions: DEFAULT_PERMISSIONS,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { user_id, name, permissions } = await req.json();
      
      // Check if admin already exists
      const existing = await adminsCollection.findOne({ user_id: Number(user_id) });
      if (existing) {
        await client.close();
        return new Response(JSON.stringify({ error: "Admin already exists" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Insert new admin
      await adminsCollection.insertOne({
        user_id: Number(user_id),
        name: name || `Admin ${user_id}`,
        permissions: { ...DEFAULT_PERMISSIONS, ...permissions },
        created_at: new Date(),
      });

      await client.close();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT") {
      const { user_id, permissions, name } = await req.json();
      
      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (permissions) updateData.permissions = permissions;
      if (name) updateData.name = name;

      await adminsCollection.updateOne(
        { user_id: Number(user_id) },
        { $set: updateData }
      );

      await client.close();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const { user_id } = await req.json();
      
      await adminsCollection.deleteOne({ user_id: Number(user_id) });

      await client.close();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await client.close();

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error managing bot admins:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
