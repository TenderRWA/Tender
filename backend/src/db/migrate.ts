import fs from "node:fs";
import path from "node:path";
import { pool } from "./index";

export async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL not configured. Skipping migrations.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(import.meta.dir, "../../db/migrations");
    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const res = await client.query(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [file]
      );

      if (res.rows.length === 0) {
        console.log(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf-8");

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(
            "INSERT INTO schema_migrations (filename) VALUES ($1)",
            [file]
          );
          await client.query("COMMIT");
          console.log(`✅ Applied migration: ${file}`);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`❌ Migration failed: ${file}`, err);
          throw err;
        }
      }
    }
  } finally {
    client.release();
  }
}
