import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { member } from "./identity";

export const wishlist = pgTable(
  "wishlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").notNull().references(() => member.id),
    title: text("title").notNull(),
    occasion: text("occasion").notNull(),
    year: integer("year").notNull(),
    slug: text("slug").notNull().unique(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    /** Null means a private draft that only its owner can see. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** False marks a list "in no particular order": no priority groups for the family. */
    ranked: boolean("ranked").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wishlist_member_occasion_year_idx").on(t.memberId, t.occasion, t.year)],
);

export const wishlistItem = pgTable(
  "wishlist_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wishlistId: uuid("wishlist_id").notNull().references(() => wishlist.id),
    title: text("title").notNull(),
    description: text("description"),
    productUrl: text("product_url"),
    imageUrl: text("image_url"),
    priceMinor: integer("price_minor"),
    currency: text("currency").notNull().default("GBP"),
    priority: text("priority").notNull().default("would_love"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("wishlist_item_priority_check", sql`${t.priority} in ('most_wanted','would_love','nice_to_have')`),
    check("wishlist_item_price_check", sql`${t.priceMinor} is null or ${t.priceMinor} >= 0`),
    index("wishlist_item_list_idx").on(t.wishlistId, t.priority, t.sortOrder),
  ],
);
