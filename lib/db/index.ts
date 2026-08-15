import "server-only";

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Server-only database client. Never import this from client components.
// Uses the DATABASE_URL (pooled connection) - credentials stay server-side.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

export const db = drizzle(pool, { schema });
