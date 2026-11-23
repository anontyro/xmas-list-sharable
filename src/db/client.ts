import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

let db: ReturnType<typeof create> | undefined;

function create() {
  // prepare: false keeps this working through Supabase's transaction-mode pooler.
  // The rest is for serverless: a function that is frozen and thawed can hold sockets the pooler has already dropped, and the
  // default settings then wait on them with no limit. Short timeouts and lifetimes make the app reconnect instead of hanging.
  return drizzle(postgres(getEnv().DATABASE_URL, { prepare: false, connect_timeout: 10, idle_timeout: 20, max_lifetime: 300 }), { schema });
}

export function getDb() {
  return (db ??= create());
}
