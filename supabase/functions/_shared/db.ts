/**
 * Shared database connection utilities for Edge Functions.
 * Supports MongoDB and PostgreSQL (Neon) via auto-detection from MONGODB_URI.
 */

import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

export type DbType = "mongodb" | "postgres";

export interface DbConnection {
  type: DbType;
  mongo?: {
    client: MongoClient;
    db: ReturnType<MongoClient["database"]>;
  };
  postgres?: ReturnType<typeof postgres>;
  close: () => Promise<void>;
}

/**
 * Normalizes and sanitizes the database URI.
 */
function normalizeUri(raw: string): string {
  let uri = raw.trim();
  // Remove accidental wrapping quotes
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }
  return uri;
}

/**
 * Detects the database type from the connection string.
 */
export function detectDbType(uri: string): DbType {
  const normalized = normalizeUri(uri);
  if (normalized.startsWith("mongodb://") || normalized.startsWith("mongodb+srv://")) {
    return "mongodb";
  }
  if (
    normalized.startsWith("postgres://") ||
    normalized.startsWith("postgresql://") ||
    normalized.includes("neon.tech") ||
    normalized.includes("supabase.co")
  ) {
    return "postgres";
  }
  // Default to postgres if unclear
  return "postgres";
}

/**
 * Normalizes MongoDB URI for Deno driver compatibility (adds authMechanism).
 */
function normalizeMongoUri(uri: string): string {
  let normalized = normalizeUri(uri);
  // Add authMechanism for Atlas SRV URLs if missing
  if (
    (normalized.startsWith("mongodb+srv://") || normalized.startsWith("mongodb://")) &&
    !/([?&])authMechanism=/.test(normalized)
  ) {
    normalized += normalized.includes("?") ? "&" : "?";
    normalized += "authMechanism=SCRAM-SHA-1";
  }
  return normalized;
}

/**
 * Connects to the database based on MONGODB_URI env var.
 * Auto-detects MongoDB vs Postgres from the connection string scheme.
 */
export async function connectDb(): Promise<DbConnection> {
  const rawUri = Deno.env.get("MONGODB_URI");
  if (!rawUri) {
    throw new Error("Database not configured. Set MONGODB_URI environment variable.");
  }

  const dbType = detectDbType(rawUri);

  if (dbType === "mongodb") {
    const mongoUri = normalizeMongoUri(rawUri);
    const client = new MongoClient();
    await client.connect(mongoUri);
    const db = client.database();

    return {
      type: "mongodb",
      mongo: { client, db },
      close: async () => {
        await client.close();
      },
    };
  } else {
    // PostgreSQL (Neon, Supabase, etc.)
    const uri = normalizeUri(rawUri);
    const sql = postgres(uri, { ssl: "require" });

    return {
      type: "postgres",
      postgres: sql,
      close: async () => {
        await sql.end();
      },
    };
  }
}

/**
 * Returns a helpful error hint for common connection issues.
 */
export function getConnectionHint(error: Error): string | undefined {
  const message = error.message || "";
  if (message.includes("bad auth") || message.includes("authentication failed")) {
    return "Authentication failed. Check username/password, URL-encode special characters (@ : / #), and ensure the URI is correct.";
  }
  if (message.includes("SASL") || message.includes("SCRAM")) {
    return "SASL authentication error. For MongoDB Atlas, ensure authMechanism=SCRAM-SHA-1 is in the URI.";
  }
  if (message.includes("connect ECONNREFUSED") || message.includes("Connection refused")) {
    return "Connection refused. Check that the database server is running and accessible.";
  }
  if (message.includes("SSL") || message.includes("TLS")) {
    return "SSL/TLS error. Ensure your database supports SSL connections.";
  }
  return undefined;
}
