import { sql } from "drizzle-orm";
import { wishlistItem } from "@/db/schema";
import type { Priority } from "./schemas";

// Every response shape for a role is declared here, with an explicit mapper, so no query can leak extra columns.
// Owner and admin views must never gain claim, interest, guest or planner fields (see decision 0006).

export type OwnerItem = {
  id: string;
  title: string;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  priceMinor: number | null;
  currency: string;
  priority: Priority;
  sortOrder: number;
};

export type OwnerWishlistView = {
  id: string;
  slug: string;
  title: string;
  occasion: string;
  year: number;
  archived: boolean;
  items: OwnerItem[];
};

export type GuestItem = OwnerItem & { createdAt: string };

export type GuestWishlistView = {
  slug: string;
  title: string;
  occasion: string;
  year: number;
  memberName: string;
  archived: boolean;
  items: GuestItem[];
};

export type FamilyDashboardView = {
  members: { id: string; displayName: string; lists: { title: string; occasion: string; year: number; slug: string }[] }[];
};

type ItemRow = typeof wishlistItem.$inferSelect;

export const toOwnerItem = (r: ItemRow): OwnerItem => ({
  id: r.id,
  title: r.title,
  description: r.description,
  productUrl: r.productUrl,
  imageUrl: r.imageUrl,
  priceMinor: r.priceMinor,
  currency: r.currency,
  priority: r.priority as Priority,
  sortOrder: r.sortOrder,
});

export const toGuestItem = (r: ItemRow): GuestItem => ({ ...toOwnerItem(r), createdAt: r.createdAt.toISOString() });

/** Most Wanted, Would Love, Nice to Have, then the owner's order. */
export const itemOrderBy = [
  sql`case ${wishlistItem.priority} when 'most_wanted' then 0 when 'would_love' then 1 else 2 end`,
  wishlistItem.sortOrder,
  wishlistItem.createdAt,
];
