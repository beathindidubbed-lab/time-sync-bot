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
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;

      if (req.method === "GET") {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        let result;

        if (db.type === "mongodb") {
          const usersCollection = db.mongo!.db.collection("users");
          const spamLogsCollection = db.mongo!.db.collection("spam_logs");

          // Try to get spam logs
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

          // Get users flagged as spammers
          const flaggedUsers = await usersCollection
            .find({ spam_flagged: true })
            .sort({ spam_count: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

          const totalFlagged = await usersCollection.countDocuments({ spam_flagged: true });

          // Get recent activity
          const recentUsers = await usersCollection
            .find({ last_active: { $gte: oneHourAgo } })
            .sort({ message_count: -1 })
            .limit(10)
            .toArray();

          result = {
            spamLogs,
            flaggedUsers: flaggedUsers.map((u) => ({
              user_id: u.user_id,
              name: u.name,
              username: u.username,
              spam_count: u.spam_count || 0,
              last_spam: u.last_spam,
              banned: u.banned,
            })),
            highActivityUsers: recentUsers.map((u) => ({
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
          };
        } else {
          // PostgreSQL
          const sql = db.postgres!;

          // Get spam logs
          const spamLogs = await sql`
            SELECT * FROM spam_logs 
            WHERE timestamp >= ${oneHourAgo} 
            ORDER BY message_count DESC 
            LIMIT 50
          `.catch(() => []);

          // Get flagged users
          const flaggedUsers = await sql`
            SELECT user_id, name, username, spam_count, last_spam, banned 
            FROM users 
            WHERE spam_flagged = true 
            ORDER BY spam_count DESC 
            LIMIT ${limit} OFFSET ${offset}
          `.catch(() => []);

          const totalFlaggedResult = await sql`
            SELECT COUNT(*)::int as count FROM users WHERE spam_flagged = true
          `.catch(() => [{ count: 0 }]);

          // Get recent activity
          const recentUsers = await sql`
            SELECT user_id, name, message_count, last_active 
            FROM users 
            WHERE last_active >= ${oneHourAgo} 
            ORDER BY message_count DESC 
            LIMIT 10
          `.catch(() => []);

          result = {
            spamLogs,
            flaggedUsers: flaggedUsers.map((u: Record<string, unknown>) => ({
              user_id: u.user_id,
              name: u.name,
              username: u.username,
              spam_count: u.spam_count || 0,
              last_spam: u.last_spam,
              banned: u.banned,
            })),
            highActivityUsers: recentUsers.map((u: Record<string, unknown>) => ({
              user_id: u.user_id,
              name: u.name,
              message_count: u.message_count || 0,
              last_active: u.last_active,
            })),
            pagination: {
              page,
              limit,
              total: totalFlaggedResult[0]?.count || 0,
              totalPages: Math.ceil((totalFlaggedResult[0]?.count || 0) / limit),
            },
          };
        }

        await db.close();

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "POST") {
        const { user_id: targetUserId, action } = await req.json();

        if (action === "clear_flag") {
          if (db.type === "mongodb") {
            const usersCollection = db.mongo!.db.collection("users");
            await usersCollection.updateOne(
              { user_id: Number(targetUserId) },
              { $set: { spam_flagged: false, spam_count: 0 } }
            );
          } else {
            const sql = db.postgres!;
            await sql`UPDATE users SET spam_flagged = false, spam_count = 0 WHERE user_id = ${Number(targetUserId)}`;
          }
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
    console.error("Error fetching spam data:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
