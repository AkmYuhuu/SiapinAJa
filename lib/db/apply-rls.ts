// Applies lib/db/rls.sql (RLS policies + profile auto-create trigger).
// Run with: npm run db:rls   (needs DATABASE_URL in .env.local)
// The SQL is idempotent (drop policy if exists before create).

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

export async function applyRls() {
  const sql = readFileSync(resolve(__dirname, "rls.sql"), "utf8");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log("RLS + trigger applied.");
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("lib/db/apply-rls.ts")) {
  applyRls()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Gagal apply RLS:", err);
      process.exit(1);
    });
}
