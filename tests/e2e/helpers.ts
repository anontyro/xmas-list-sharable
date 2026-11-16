import { drizzle } from "drizzle-orm/postgres-js";
import { getTableName, isTable, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../../src/db/schema";
import { generateSlug } from "../../src/features/wishlists/slug";
import { hashPin } from "../../src/lib/security/password";

const client = postgres(process.env.DATABASE_URL!, { max: 2 });
const db = drizzle(client, { schema });
const tables = Object.values(schema).filter(isTable).map((t) => `"${getTableName(t)}"`).join(", ");

export const ADMIN_SECRET = process.env.ADMIN_SECRET!;

/** Empties the database and leaves just the household, as `pnpm db:seed` would. */
export async function resetAndSeed() {
  await db.execute(sql.raw(`truncate ${tables} restart identity cascade`));
  const [h] = await db.insert(schema.household).values({ name: "Family" }).returning();
  return h.id;
}

export async function createMemberWithPin(householdId: string, displayName: string, pin: string) {
  const [m] = await db.insert(schema.member).values({ householdId, displayName, pinHash: await hashPin(pin) }).returning();
  return m.id;
}

export async function createList(memberId: string, title = "Christmas 2026", archived = false) {
  const slug = generateSlug();
  const [l] = await db
    .insert(schema.wishlist)
    .values({ memberId, title, occasion: "Christmas", year: 2026, slug, archivedAt: archived ? new Date() : null })
    .returning();
  return { id: l.id, slug };
}
