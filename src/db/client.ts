import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

let db: ReturnType<typeof create> | undefined;

function create() {
  // prepare: false keeps this working through Supabase's transaction-mode pooler.
  return drizzle(postgres(getEnv().DATABASE_URL, { prepare: false }), { schema });
}

export function getDb() {
  return (db ??= create());
}
