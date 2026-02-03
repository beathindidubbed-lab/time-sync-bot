import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeMongoUri(raw: string) {
  let uri = raw.trim();
  // Common pitfall when pasting secrets: accidental wrapping quotes
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }

  // denodrivers/mongo recommends setting authMechanism explicitly for Atlas SRV URLs.
  // If it's missing, default to SCRAM-SHA-1 (supported by the driver and Atlas).
  if ((uri.startsWith("mongodb+srv://") || uri.startsWith("mongodb://")) && !/([?&])authMechanism=/.test(uri)) {
    uri += uri.includes("?") ? "&" : "?";
    uri += "authMechanism=SCRAM-SHA-1";
  }

  return uri;
}

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
    const rawMongoUri = Deno.env.get("MONGODB_URI");
    const mongoUri = rawMongoUri ? normalizeMongoUri(rawMongoUri) : null;
    if (!mongoUri) {
      return new Response(JSON.stringify({ error: "MongoDB not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const client = new MongoClient();
    await client.connect(mongoUri);
    
    const db = client.database(); // Uses default database from URI
    
    // Get stats from various collections
    const usersCollection = db.collection("users");
    const filesCollection = db.collection("files");
    
    const [totalUsers, totalFiles, bannedUsers, premiumUsers] = await Promise.all([
      usersCollection.countDocuments({}),
      filesCollection.countDocuments({}),
      usersCollection.countDocuments({ banned: true }),
      usersCollection.countDocuments({ is_premium: true }),
    ]);

    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await usersCollection.countDocuments({
      joined_date: { $gte: sevenDaysAgo }
    });

    // Get total file size (if stored)
    const filesWithSize = await filesCollection.aggregate([
      { $group: { _id: null, totalSize: { $sum: "$file_size" } } }
    ]).toArray();
    
    const totalStorageUsed = filesWithSize[0]?.totalSize || 0;

    await client.close();

    return new Response(JSON.stringify({
      users: {
        total: totalUsers,
        banned: bannedUsers,
        premium: premiumUsers,
        recentWeek: recentUsers,
      },
      files: {
        total: totalFiles,
        totalStorageBytes: totalStorageUsed,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching bot stats:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint =
      typeof message === "string" &&
      (message.includes("bad auth") || message.includes("authentication failed"))
        ? "MongoDB authentication failed. Double-check username/password, remove any surrounding quotes in MONGODB_URI, URL-encode special characters in the password (e.g. @, :, /, #), and ensure the URI includes authMechanism=SCRAM-SHA-1 when using Atlas."
        : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
