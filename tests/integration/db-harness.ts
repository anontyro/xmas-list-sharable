import { drizzle } from "drizzle-orm/postgres-js";
import { getTableName, isTable, sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeEach } from "vitest";
import * as schema from "@/db/schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });

const tables = Object.values(schema)
  .filter(isTable)
  .map((t) => `"${getTableName(t)}"`)
  .join(", ");

/** Import this file from a test to get an empty database before every test. */
beforeEach(async () => {
  await db.execute(sql.raw(`truncate ${tables} restart identity cascade`));
});

afterAll(async () => {
  await client.end();
});
