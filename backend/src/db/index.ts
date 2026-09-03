import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl:
    process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("supabase.com") || process.env.NODE_ENV === "production")
      ? { rejectUnauthorized: false }
      : false,
});

export const query = async (text: string, params?: unknown[]) => {
  if (!process.env.DATABASE_URL) {
    return { rows: [], rowCount: 0 };
  }
  return pool.query(text, params);
};
