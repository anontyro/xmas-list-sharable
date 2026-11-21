import { boolean, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const household = pgTable("household", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable(
  "member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => household.id),
    displayName: text("display_name").notNull(),
    pinHash: text("pin_hash"),
    /** Optional picture: the name of one of the allowed stickers, checked in code (src/features/family/avatars.ts), not by the database. Null means initials. */
    avatar: text("avatar"),
    active: boolean("active").notNull().default(true),
    /** Null while a self-registered member waits for the admin; the admin and migration set it for everyone else. */
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("member_active_name_idx").on(t.householdId, t.displayName).where(sql`${t.active}`)],
);

export const guest = pgTable("guest", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => household.id),
  displayName: text("display_name").notNull(),
  /** The member this guest is the viewer side of (FG-003 decision 0025). Null for an ordinary guest; one guest per member. */
  memberId: uuid("member_id").unique().references(() => member.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    principalType: text("principal_type").notNull(),
    principalId: uuid("principal_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("session_principal_type_check", sql`${t.principalType} in ('admin','owner','guest')`),
    index("session_principal_idx").on(t.principalType, t.principalId),
  ],
);

export const recoveryToken = pgTable(
  "recovery_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guestId: uuid("guest_id").notNull().references(() => guest.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("recovery_token_one_active_per_guest").on(t.guestId).where(sql`${t.revokedAt} is null`)],
);
