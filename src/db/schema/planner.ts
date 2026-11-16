import { boolean, check, integer, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { guest, member } from "./identity";
import { wishlistItem } from "./wishlist";

export const guestPlanner = pgTable(
  "guest_planner",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guestId: uuid("guest_id").notNull().references(() => guest.id, { onDelete: "cascade" }),
    occasion: text("occasion").notNull(),
    year: integer("year").notNull(),
    budgetMinor: integer("budget_minor"),
  },
  (t) => [
    unique("guest_planner_guest_occasion_year").on(t.guestId, t.occasion, t.year),
    check("guest_planner_budget_check", sql`${t.budgetMinor} is null or ${t.budgetMinor} >= 0`),
  ],
);

export const recipientBudget = pgTable(
  "recipient_budget",
  {
    plannerId: uuid("planner_id").notNull().references(() => guestPlanner.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => member.id),
    budgetMinor: integer("budget_minor").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.plannerId, t.memberId] }),
    check("recipient_budget_check", sql`${t.budgetMinor} >= 0`),
  ],
);

export const plannerItem = pgTable(
  "planner_item",
  {
    plannerId: uuid("planner_id").notNull().references(() => guestPlanner.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull().references(() => wishlistItem.id),
    privateNote: text("private_note"),
    actualPriceMinor: integer("actual_price_minor"),
    included: boolean("included").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.plannerId, t.itemId] }),
    check("planner_item_actual_check", sql`${t.actualPriceMinor} is null or ${t.actualPriceMinor} >= 0`),
  ],
);
