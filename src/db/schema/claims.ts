import { check, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { guest } from "./identity";
import { wishlistItem } from "./wishlist";

export const itemInterest = pgTable(
  "item_interest",
  {
    guestId: uuid("guest_id").notNull().references(() => guest.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull().references(() => wishlistItem.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.guestId, t.itemId] })],
);

export const itemClaim = pgTable(
  "item_claim",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id").notNull().references(() => wishlistItem.id),
    guestId: uuid("guest_id").notNull().references(() => guest.id),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (t) => [
    check("item_claim_status_check", sql`${t.status} in ('reserved','purchased')`),
    // The exclusive claim: at most one unreleased claim per item (a purchased claim is still unreleased).
    uniqueIndex("item_claim_one_active_per_item").on(t.itemId).where(sql`${t.releasedAt} is null`),
    index("item_claim_guest_idx").on(t.guestId),
  ],
);
