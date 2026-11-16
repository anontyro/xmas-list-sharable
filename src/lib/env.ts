import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_SECRET: z.string().min(12),
  SESSION_SECRET: z.string().min(32),
  TEST_DATABASE_URL: z.string().min(1).optional(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return schema.parse(source);
}

let cached: Env | undefined;

/** Validated on first use, so importing this never breaks a build that does not need the values. */
export function getEnv(): Env {
  return (cached ??= parseEnv(process.env));
}
