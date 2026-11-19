import { headers } from "next/headers";

/**
 * Who is calling, for the throttles. Vercel sets `x-real-ip` itself and overwrites `x-forwarded-for`, so on Vercel either is safe.
 * Behind any other proxy only the entry that proxy added (the LAST one) can be trusted; the first is whatever the caller sent, and
 * trusting it would give every try a fresh throttle bucket. Deploy on Vercel, or behind a proxy that overwrites these headers.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return hops.at(-1) ?? "unknown";
}
