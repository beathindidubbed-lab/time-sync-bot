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

    const userId = claimsData.claims.sub;

    // Check if user is authorized (owner or admin with can_broadcast permission)
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
    const broadcastCollection = db.collection("broadcasts");
    const usersCollection = db.collection("users");

    if (req.method === "GET") {
      // Get broadcast history
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const total = await broadcastCollection.countDocuments({});
      const broadcasts = await broadcastCollection
        .find({})
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      // Get total active users count for reference
      const totalUsers = await usersCollection.countDocuments({ banned: { $ne: true } });

      await client.close();

      return new Response(JSON.stringify({
        broadcasts: broadcasts.map(b => ({
          _id: b._id.toString(),
          message: b.message,
          type: b.type || "text", // text, photo, video, document
          status: b.status, // pending, in_progress, completed, failed
          total_users: b.total_users,
          sent_count: b.sent_count || 0,
          failed_count: b.failed_count || 0,
          created_at: b.created_at,
          completed_at: b.completed_at,
          created_by: b.created_by,
          options: b.options, // pin, delete_after, etc.
        })),
        total_active_users: totalUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { message, type, options } = await req.json();
      
      if (!message || message.trim() === "") {
        await client.close();
        return new Response(JSON.stringify({ error: "Message is required" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Get total active users
      const totalUsers = await usersCollection.countDocuments({ banned: { $ne: true } });

      // Create broadcast record
      // The actual sending will be handled by the Python bot polling this collection
      const broadcastId = await broadcastCollection.insertOne({
        message: message.trim(),
        type: type || "text",
        status: "pending",
        total_users: totalUsers,
        sent_count: 0,
        failed_count: 0,
        created_at: new Date(),
        created_by: userId,
        options: {
          pin: options?.pin || false,
          delete_after: options?.delete_after || null, // seconds
          forward: options?.forward || false,
        },
      });

      await client.close();

      return new Response(JSON.stringify({ 
        success: true, 
        broadcast_id: broadcastId.toString(),
        total_users: totalUsers,
        message: "Broadcast queued successfully. The bot will process it shortly." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const broadcastId = url.searchParams.get("id");

      if (!broadcastId) {
        await client.close();
        return new Response(JSON.stringify({ error: "Broadcast ID is required" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Only allow canceling pending broadcasts
      const broadcast = await broadcastCollection.findOne({ _id: broadcastId });
      if (broadcast?.status !== "pending") {
        await client.close();
        return new Response(JSON.stringify({ error: "Can only cancel pending broadcasts" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      await broadcastCollection.updateOne(
        { _id: broadcastId },
        { $set: { status: "cancelled", cancelled_at: new Date() } }
      );

      await client.close();

      return new Response(JSON.stringify({ success: true, message: "Broadcast cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await client.close();
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error managing broadcast:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
