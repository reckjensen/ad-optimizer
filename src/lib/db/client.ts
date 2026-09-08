import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForDb = globalThis as unknown as {
  __adOptimizerDb?: ReturnType<typeof createDb>;
};

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Local Postgres or Neon (pooled/direct). Avoids Neon HTTP so seed/analysis
  // scripts can use transactions.
  // Drizzle v1: pass `{ client }` (not `(client, config)`).
  const client = postgres(connectionString, { max: 10 });
  return drizzle({ client });
}

export const db =
  globalForDb.__adOptimizerDb ?? (globalForDb.__adOptimizerDb = createDb());

export type Db = typeof db;
