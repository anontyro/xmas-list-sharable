import { z } from "zod";
import { parsePoundsToMinor } from "@/lib/money";

/** A money field from a form: "" means "not set". */
const moneyField = z.string().trim().refine((v) => v === "" || parsePoundsToMinor(v) !== null, "Enter an amount like 19.99");

/** Turns a validated money field into pence, or null when empty. */
export const toMinor = (v: string): number | null => (v === "" ? null : parsePoundsToMinor(v));

export const period = z.object({
  occasion: z.string().trim().min(1).max(40),
  year: z.number().int().min(2000).max(2100),
});
export type Period = z.infer<typeof period>;

export const budgetsInput = period.extend({
  total: moneyField,
  recipients: z.array(z.object({ memberId: z.string().uuid(), budget: moneyField })).max(100),
});
export type BudgetsInput = z.input<typeof budgetsInput>;

export const entryInput = z.object({
  itemId: z.string().uuid(),
  note: z.string().trim().max(500, "Keep notes under 500 characters"),
  actualPrice: moneyField,
  included: z.boolean(),
});
export type EntryInput = z.input<typeof entryInput>;
