import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Login and import throttling that survives across serverless instances. Keys never contain a raw PIN. */
export const authLimit = pgTable("auth_limit", {
  subjectKey: text("subject_key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  attemptCount: integer("attempt_count").notNull().default(0),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
});
