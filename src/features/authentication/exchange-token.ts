export type ExchangeResult = "ok" | "throttled" | "failed";

/** Swaps a recovery token for a guest session through the exchange route. The token goes in the request body only: never a URL, a log or storage. */
export async function exchangeRecoveryToken(token: string): Promise<ExchangeResult> {
  try {
    const r = await fetch("/api/recovery/exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store" });
    return r.status === 204 ? "ok" : r.status === 429 ? "throttled" : "failed";
  } catch {
    return "failed";
  }
}

export const EXCHANGE_MESSAGES: Record<Exclude<ExchangeResult, "ok">, string> = {
  failed: "This link doesn't work. It may have been replaced or turned off.",
  throttled: "Too many attempts. Try again in a few minutes.",
};
