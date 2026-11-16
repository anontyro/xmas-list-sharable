import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  // The harness truncates every table, so never let it run against the dev database.
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL");
  const client = postgres(url, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: "src/db/migrations" });
  await client.end();
}
