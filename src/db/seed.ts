import { randomBytes } from "node:crypto";
import { getDb } from "./client";
import { household, member, wishlist } from "./schema";

const db = getDb();

let [hh] = await db.select().from(household).limit(1);
if (!hh) [hh] = await db.insert(household).values({ name: "Family" }).returning();

if (process.argv.includes("--demo")) {
  const names = ["Alex", "Sarah"];
  for (const name of names) {
    const [m] = await db
      .insert(member)
      .values({ householdId: hh.id, displayName: name })
      .onConflictDoNothing()
      .returning();
    // Demo only: the real slug generator arrives with the owner-list release. Owner PINs are set from the admin page.
    if (m) await db.insert(wishlist).values({ memberId: m.id, title: "Christmas 2026", occasion: "Christmas", year: 2026, slug: randomBytes(8).toString("base64url").slice(0, 10) });
  }
}

console.log("Seed complete");
process.exit(0);
