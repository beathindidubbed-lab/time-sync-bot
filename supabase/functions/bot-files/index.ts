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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("search") || "";
    const fileType = url.searchParams.get("type") || "";

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
    const filesCollection = db.collection("files");
    
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

    await client.close();

    return new Response(JSON.stringify({
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
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching bot files:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
