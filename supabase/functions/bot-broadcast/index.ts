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
      if (req.method === "GET") {
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let result;

        if (db.type === "mongodb") {
          const broadcastCollection = db.mongo!.db.collection("broadcasts");
          const usersCollection = db.mongo!.db.collection("users");

          const total = await broadcastCollection.countDocuments({});
          const broadcasts = await broadcastCollection
            .find({})
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

          const totalUsers = await usersCollection.countDocuments({ banned: { $ne: true } });

          result = {
            broadcasts: broadcasts.map((b) => ({
              _id: b._id.toString(),
              message: b.message,
              type: b.type || "text",
              status: b.status,
              total_users: b.total_users,
              sent_count: b.sent_count || 0,
              failed_count: b.failed_count || 0,
              created_at: b.created_at,
              completed_at: b.completed_at,
              created_by: b.created_by,
              options: b.options,
            })),
            total_active_users: totalUsers,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          };
        } else {
          const sql = db.postgres!;

          const [totalResult, broadcasts, totalUsersResult] = await Promise.all([
            sql`SELECT COUNT(*)::int as count FROM broadcasts`,
            sql`SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
            sql`SELECT COUNT(*)::int as count FROM users WHERE banned IS NULL OR banned = false`,
          ]);

          result = {
            broadcasts: broadcasts.map((b: Record<string, unknown>) => ({
              _id: b.id,
              message: b.message,
              type: b.type || "text",
              status: b.status,
              total_users: b.total_users,
              sent_count: b.sent_count || 0,
              failed_count: b.failed_count || 0,
              created_at: b.created_at,
              completed_at: b.completed_at,
              created_by: b.created_by,
              options: b.options,
            })),
            total_active_users: totalUsersResult[0]?.count || 0,
            pagination: {
              page,
              limit,
              total: totalResult[0]?.count || 0,
              totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
            },
          };
        }

        await db.close();

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "POST") {
        const { message, type, options } = await req.json();

        if (!message || message.trim() === "") {
          await db.close();
          return new Response(JSON.stringify({ error: "Message is required" }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        let totalUsers = 0;
        let broadcastId: string;

        if (db.type === "mongodb") {
          const broadcastCollection = db.mongo!.db.collection("broadcasts");
          const usersCollection = db.mongo!.db.collection("users");

          totalUsers = await usersCollection.countDocuments({ banned: { $ne: true } });

          const insertResult = await broadcastCollection.insertOne({
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
              delete_after: options?.delete_after || null,
              forward: options?.forward || false,
            },
          });

          broadcastId = insertResult.toString();
        } else {
          const sql = db.postgres!;

          const totalUsersResult = await sql`SELECT COUNT(*)::int as count FROM users WHERE banned IS NULL OR banned = false`;
          totalUsers = totalUsersResult[0]?.count || 0;

          const insertResult = await sql`
            INSERT INTO broadcasts (message, type, status, total_users, sent_count, failed_count, created_at, created_by, options)
            VALUES (${message.trim()}, ${type || "text"}, 'pending', ${totalUsers}, 0, 0, NOW(), ${userId}, ${JSON.stringify({
              pin: options?.pin || false,
              delete_after: options?.delete_after || null,
              forward: options?.forward || false,
            })}::jsonb)
            RETURNING id
          `;

          broadcastId = insertResult[0]?.id;
        }

        await db.close();

        return new Response(JSON.stringify({ 
          success: true, 
          broadcast_id: broadcastId,
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
          await db.close();
          return new Response(JSON.stringify({ error: "Broadcast ID is required" }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        if (db.type === "mongodb") {
          const broadcastCollection = db.mongo!.db.collection("broadcasts");

          const broadcast = await broadcastCollection.findOne({ _id: broadcastId });
          if (broadcast?.status !== "pending") {
            await db.close();
            return new Response(JSON.stringify({ error: "Can only cancel pending broadcasts" }), { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          await broadcastCollection.updateOne(
            { _id: broadcastId },
            { $set: { status: "cancelled", cancelled_at: new Date() } }
          );
        } else {
          const sql = db.postgres!;

          const broadcast = await sql`SELECT status FROM broadcasts WHERE id = ${broadcastId} LIMIT 1`;
          if (broadcast[0]?.status !== "pending") {
            await db.close();
            return new Response(JSON.stringify({ error: "Can only cancel pending broadcasts" }), { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
          }

          await sql`UPDATE broadcasts SET status = 'cancelled', cancelled_at = NOW() WHERE id = ${broadcastId}`;
        }

        await db.close();

        return new Response(JSON.stringify({ success: true, message: "Broadcast cancelled" }), {
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
    console.error("Error managing broadcast:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
