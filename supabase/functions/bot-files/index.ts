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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("search") || "";
    const fileType = url.searchParams.get("type") || "";

    // Connect to database (auto-detects MongoDB or Postgres)
    const db = await connectDb();

    try {
      let result;

      if (db.type === "mongodb") {
        const filesCollection = db.mongo!.db.collection("files");

        // Build query
        const query: Record<string, unknown> = {};
        if (search) {
          query.$or = [
            { file_name: { $regex: search, $options: "i" } },
            { caption: { $regex: search, $options: "i" } },
          ];
        }
        if (fileType) {
          query.file_type = fileType;
        }

        const total = await filesCollection.countDocuments(query);
        const files = await filesCollection
          .find(query)
          .sort({ created_at: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray();

        result = {
          files: files.map((file) => ({
            _id: file._id,
            file_id: file.file_id,
            file_name: file.file_name,
            file_type: file.file_type,
            file_size: file.file_size,
            caption: file.caption,
            downloads: file.downloads || 0,
            created_at: file.created_at,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      } else {
        // PostgreSQL
        const sql = db.postgres!;
        const offset = (page - 1) * limit;

        let countQuery;
        let filesQuery;

        if (search && fileType) {
          countQuery = sql`SELECT COUNT(*)::int as count FROM files WHERE (file_name ILIKE ${'%' + search + '%'} OR caption ILIKE ${'%' + search + '%'}) AND file_type = ${fileType}`;
          filesQuery = sql`SELECT * FROM files WHERE (file_name ILIKE ${'%' + search + '%'} OR caption ILIKE ${'%' + search + '%'}) AND file_type = ${fileType} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        } else if (search) {
          countQuery = sql`SELECT COUNT(*)::int as count FROM files WHERE file_name ILIKE ${'%' + search + '%'} OR caption ILIKE ${'%' + search + '%'}`;
          filesQuery = sql`SELECT * FROM files WHERE file_name ILIKE ${'%' + search + '%'} OR caption ILIKE ${'%' + search + '%'} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        } else if (fileType) {
          countQuery = sql`SELECT COUNT(*)::int as count FROM files WHERE file_type = ${fileType}`;
          filesQuery = sql`SELECT * FROM files WHERE file_type = ${fileType} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        } else {
          countQuery = sql`SELECT COUNT(*)::int as count FROM files`;
          filesQuery = sql`SELECT * FROM files ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        }

        const [countResult, files] = await Promise.all([countQuery, filesQuery]);
        const total = countResult[0]?.count || 0;

        result = {
          files: files.map((file: Record<string, unknown>) => ({
            _id: file.id,
            file_id: file.file_id,
            file_name: file.file_name,
            file_type: file.file_type,
            file_size: file.file_size,
            caption: file.caption,
            downloads: file.downloads || 0,
            created_at: file.created_at,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
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
    console.error("Error fetching bot files:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = error instanceof Error ? getConnectionHint(error) : undefined;
    return new Response(JSON.stringify({ error: message, hint }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
