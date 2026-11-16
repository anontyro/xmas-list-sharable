import { headers } from "next/headers";

/** First hop of x-forwarded-for (set by Vercel), else "unknown". */
export async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "unknown";
}
