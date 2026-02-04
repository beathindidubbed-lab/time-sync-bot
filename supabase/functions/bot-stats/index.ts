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

    // Connect to database (auto-detects MongoDB or Postgres)
    const db = await connectDb();

    try {
      let stats;

      if (db.type === "mongodb") {
        const usersCollection = db.mongo!.db.collection("users");
        const filesCollection = db.mongo!.db.collection("files");

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

        // Get total file size
        const filesWithSize = await filesCollection.aggregate([
          { $group: { _id: null, totalSize: { $sum: "$file_size" } } }
        ]).toArray();

        const totalStorageUsed = filesWithSize[0]?.totalSize || 0;

        stats = {
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
        };
      } else {
        // PostgreSQL
        const sql = db.postgres!;

        const [usersResult, filesResult, bannedResult, premiumResult, recentResult, storageResult] = await Promise.all([
          sql`SELECT COUNT(*)::int as count FROM users`,
          sql`SELECT COUNT(*)::int as count FROM files`,
          sql`SELECT COUNT(*)::int as count FROM users WHERE banned = true`,
          sql`SELECT COUNT(*)::int as count FROM users WHERE is_premium = true`,
          sql`SELECT COUNT(*)::int as count FROM users WHERE joined_date >= NOW() - INTERVAL '7 days'`,
          sql`SELECT COALESCE(SUM(file_size), 0)::bigint as total FROM files`,
        ]);

        stats = {
          users: {
            total: usersResult[0]?.count || 0,
            banned: bannedResult[0]?.count || 0,
            premium: premiumResult[0]?.count || 0,
            recentWeek: recentResult[0]?.count || 0,
          },
          files: {
            total: filesResult[0]?.count || 0,
            totalStorageBytes: Number(storageResult[0]?.total || 0),
          },
        };
      }

      await db.close();

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await db.close();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error fetching bot stats:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
