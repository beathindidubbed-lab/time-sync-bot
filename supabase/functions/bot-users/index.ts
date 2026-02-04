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

    // Check if user is owner or admin
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
      // Handle ban/unban actions
      if (req.method === "POST") {
        const { user_id: targetUserId, action } = await req.json();

        if (db.type === "mongodb") {
          const usersCollection = db.mongo!.db.collection("users");

          if (action === "ban") {
            await usersCollection.updateOne(
              { user_id: Number(targetUserId) },
              { $set: { banned: true, banned_at: new Date() } }
            );
          } else if (action === "unban") {
            await usersCollection.updateOne(
              { user_id: Number(targetUserId) },
              { $set: { banned: false }, $unset: { banned_at: "" } }
            );
          }
        } else {
          const sql = db.postgres!;

          if (action === "ban") {
            await sql`UPDATE users SET banned = true, banned_at = NOW() WHERE user_id = ${Number(targetUserId)}`;
          } else if (action === "unban") {
            await sql`UPDATE users SET banned = false, banned_at = NULL WHERE user_id = ${Number(targetUserId)}`;
          }
        }

        await db.close();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // GET request - fetch users
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const search = url.searchParams.get("search") || "";
      const filter = url.searchParams.get("filter") || "all";
      const offset = (page - 1) * limit;

      let result;

      if (db.type === "mongodb") {
        const usersCollection = db.mongo!.db.collection("users");

        // Build query
        const query: Record<string, unknown> = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { user_id: parseInt(search) || 0 },
          ];
        }

        // Apply filters
        if (filter === "banned") {
          query.banned = true;
        } else if (filter === "active") {
          query.banned = { $ne: true };
        } else if (filter === "premium") {
          query.is_premium = true;
        }

        const total = await usersCollection.countDocuments(query);
        const users = await usersCollection
          .find(query)
          .sort({ joined_date: -1 })
          .skip(offset)
          .limit(limit)
          .toArray();

        // Get stats
        const [totalUsers, bannedUsers, premiumUsers] = await Promise.all([
          usersCollection.countDocuments({}),
          usersCollection.countDocuments({ banned: true }),
          usersCollection.countDocuments({ is_premium: true }),
        ]);

        result = {
          users: users.map((user) => ({
            _id: user._id,
            user_id: isOwner ? user.user_id : `***${String(user.user_id).slice(-4)}`,
            name: user.name,
            banned: user.banned,
            banned_at: user.banned_at,
            is_premium: user.is_premium,
            joined_date: user.joined_date,
            spam_flagged: user.spam_flagged,
            spam_count: user.spam_count,
            ...(isOwner && { username: user.username, phone: user.phone }),
          })),
          stats: {
            total: totalUsers,
            banned: bannedUsers,
            premium: premiumUsers,
            active: totalUsers - bannedUsers,
          },
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
      } else {
        // PostgreSQL
        const sql = db.postgres!;

        // Build WHERE clause based on filters
        let whereClause = sql`WHERE 1=1`;
        if (search) {
          whereClause = sql`WHERE (name ILIKE ${'%' + search + '%'} OR CAST(user_id AS TEXT) LIKE ${'%' + search + '%'})`;
        }

        let filterClause = sql``;
        if (filter === "banned") {
          filterClause = sql` AND banned = true`;
        } else if (filter === "active") {
          filterClause = sql` AND (banned IS NULL OR banned = false)`;
        } else if (filter === "premium") {
          filterClause = sql` AND is_premium = true`;
        }

        // This is a simplified approach - for complex dynamic queries in Postgres
        // we need to handle differently
        let users;
        let total = 0;

        if (search && filter !== "all") {
          const countResult = await sql`SELECT COUNT(*)::int as count FROM users WHERE (name ILIKE ${'%' + search + '%'} OR CAST(user_id AS TEXT) LIKE ${'%' + search + '%'}) AND ${filter === "banned" ? sql`banned = true` : filter === "active" ? sql`(banned IS NULL OR banned = false)` : sql`is_premium = true`}`;
          users = await sql`SELECT * FROM users WHERE (name ILIKE ${'%' + search + '%'} OR CAST(user_id AS TEXT) LIKE ${'%' + search + '%'}) AND ${filter === "banned" ? sql`banned = true` : filter === "active" ? sql`(banned IS NULL OR banned = false)` : sql`is_premium = true`} ORDER BY joined_date DESC LIMIT ${limit} OFFSET ${offset}`;
          total = countResult[0]?.count || 0;
        } else if (search) {
          const countResult = await sql`SELECT COUNT(*)::int as count FROM users WHERE name ILIKE ${'%' + search + '%'} OR CAST(user_id AS TEXT) LIKE ${'%' + search + '%'}`;
          users = await sql`SELECT * FROM users WHERE name ILIKE ${'%' + search + '%'} OR CAST(user_id AS TEXT) LIKE ${'%' + search + '%'} ORDER BY joined_date DESC LIMIT ${limit} OFFSET ${offset}`;
          total = countResult[0]?.count || 0;
        } else if (filter === "banned") {
          const countResult = await sql`SELECT COUNT(*)::int as count FROM users WHERE banned = true`;
          users = await sql`SELECT * FROM users WHERE banned = true ORDER BY joined_date DESC LIMIT ${limit} OFFSET ${offset}`;
          total = countResult[0]?.count || 0;
        } else if (filter === "active") {
          const countResult = await sql`SELECT COUNT(*)::int as count FROM users WHERE banned IS NULL OR banned = false`;
          users = await sql`SELECT * FROM users WHERE banned IS NULL OR banned = false ORDER BY joined_date DESC LIMIT ${limit} OFFSET ${offset}`;
          total = countResult[0]?.count || 0;
        } else if (filter === "premium") {
          const countResult = await sql`SELECT COUNT(*)::int as count FROM users WHERE is_premium = true`;
          users = await sql`SELECT * FROM users WHERE is_premium = true ORDER BY joined_date DESC LIMIT ${limit} OFFSET ${offset}`;
          total = countResult[0]?.count || 0;
        } else {
          const countResult = await sql`SELECT COUNT(*)::int as count FROM users`;
          users = await sql`SELECT * FROM users ORDER BY joined_date DESC LIMIT ${limit} OFFSET ${offset}`;
          total = countResult[0]?.count || 0;
        }

        // Get stats
        const [totalUsersResult, bannedUsersResult, premiumUsersResult] = await Promise.all([
          sql`SELECT COUNT(*)::int as count FROM users`,
          sql`SELECT COUNT(*)::int as count FROM users WHERE banned = true`,
          sql`SELECT COUNT(*)::int as count FROM users WHERE is_premium = true`,
        ]);

        const totalUsers = totalUsersResult[0]?.count || 0;
        const bannedUsers = bannedUsersResult[0]?.count || 0;
        const premiumUsers = premiumUsersResult[0]?.count || 0;

        result = {
          users: users.map((user: Record<string, unknown>) => ({
            _id: user.id,
            user_id: isOwner ? user.user_id : `***${String(user.user_id).slice(-4)}`,
            name: user.name,
            banned: user.banned,
            banned_at: user.banned_at,
            is_premium: user.is_premium,
            joined_date: user.joined_date,
            spam_flagged: user.spam_flagged,
            spam_count: user.spam_count,
            ...(isOwner && { username: user.username, phone: user.phone }),
          })),
          stats: {
            total: totalUsers,
            banned: bannedUsers,
            premium: premiumUsers,
            active: totalUsers - bannedUsers,
          },
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
      }

      await db.close();

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await db.close();
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error fetching bot users:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
