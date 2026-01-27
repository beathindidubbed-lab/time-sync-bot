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

    // Check if user is owner (only owners can see full user data)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const isOwner = roleData?.role === "owner";

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("search") || "";

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
    
    // Build query
    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { user_id: parseInt(search) || 0 },
      ];
    }

    const total = await usersCollection.countDocuments(query);
    const users = await usersCollection
      .find(query)
      .sort({ joined_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    await client.close();

    // If not owner, mask sensitive data
    const sanitizedUsers = users.map((user) => ({
      _id: user._id,
      user_id: isOwner ? user.user_id : `***${String(user.user_id).slice(-4)}`,
      name: user.name,
      banned: user.banned,
      is_premium: user.is_premium,
      joined_date: user.joined_date,
      // Hide these from non-owners
      ...(isOwner && {
        username: user.username,
        phone: user.phone,
      }),
    }));

    return new Response(JSON.stringify({
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching bot users:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
