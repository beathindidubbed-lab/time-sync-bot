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
    const usersCollection = db.collection("users");
    const spamLogsCollection = db.collection("spam_logs");

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    if (req.method === "GET") {
      // Get users with high message counts (potential spammers)
      // This looks for users who have sent many messages recently
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Try to get spam logs if the collection exists
      let spamLogs: unknown[] = [];
      try {
        spamLogs = await spamLogsCollection
          .find({ timestamp: { $gte: oneHourAgo } })
          .sort({ message_count: -1 })
          .limit(50)
          .toArray();
      } catch {
        // Collection might not exist yet
      }

      // Get users who might be flagged as spammers
      const flaggedUsers = await usersCollection
        .find({ spam_flagged: true })
        .sort({ spam_count: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const totalFlagged = await usersCollection.countDocuments({ spam_flagged: true });

      // Get recent activity stats
      const recentUsers = await usersCollection
        .find({ last_active: { $gte: oneHourAgo } })
        .sort({ message_count: -1 })
        .limit(10)
        .toArray();

      await client.close();

      return new Response(JSON.stringify({
        spamLogs,
        flaggedUsers: flaggedUsers.map(u => ({
          user_id: u.user_id,
          name: u.name,
          username: u.username,
          spam_count: u.spam_count || 0,
          last_spam: u.last_spam,
          banned: u.banned,
        })),
        highActivityUsers: recentUsers.map(u => ({
          user_id: u.user_id,
          name: u.name,
          message_count: u.message_count || 0,
          last_active: u.last_active,
        })),
        pagination: {
          page,
          limit,
          total: totalFlagged,
          totalPages: Math.ceil(totalFlagged / limit),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Clear spam flag for a user
      const { user_id, action } = await req.json();
      
      if (action === "clear_flag") {
        await usersCollection.updateOne(
          { user_id: Number(user_id) },
          { $set: { spam_flagged: false, spam_count: 0 } }
        );
      }

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
    console.error("Error fetching spam data:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
