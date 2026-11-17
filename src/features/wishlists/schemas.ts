import { z } from "zod";
import { parsePoundsToMinor } from "@/lib/money";

export const PRIORITIES = ["most_wanted", "would_love", "nice_to_have"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  most_wanted: "Most Wanted",
  would_love: "Would Love",
  nice_to_have: "Nice to Have",
};

/** Forms send "" for an empty field; treat that as "not given". */
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const httpUrl = z
  .string()
  .trim()
  .max(2000, "That address is too long")
  .refine((v) => {
    try {
      const { protocol } = new URL(v);
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a web address starting with http:// or https://");

export const itemInput = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(120, "Keep the title under 120 characters"),
    description: optional(z.string().trim().max(1000, "Keep the notes under 1000 characters")),
    productUrl: optional(httpUrl),
    imageUrl: optional(httpUrl),
    price: optional(z.string().trim().refine((v) => parsePoundsToMinor(v) !== null, "Enter a price like 19.99")),
    priority: z.enum(PRIORITIES).default("would_love"),
  })
  .transform(({ price, description, productUrl, imageUrl, ...rest }) => ({
    ...rest,
    description: description ?? null,
    productUrl: productUrl ?? null,
    imageUrl: imageUrl ?? null,
    priceMinor: price === undefined ? null : parsePoundsToMinor(price),
  }));

export type OwnerItemInput = z.input<typeof itemInput>;

/** First message per field, for showing errors next to the inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}
