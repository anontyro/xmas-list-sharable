import { afterEach, describe, expect, it, vi } from "vitest";
import { EXCHANGE_MESSAGES, exchangeRecoveryToken } from "@/features/authentication/exchange-token";

const TOKEN = "k9ZtQ4x7mWvB2LpR8cNd5hYeA1sFgJ3uXoVi6Tq0wZb";
afterEach(() => vi.unstubAllGlobals());

const respondWith = (status: number) => {
  const fetchMock = vi.fn(async () => new Response(null, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("exchangeRecoveryToken", () => {
  it("sends the token in the request body only, never in the address, and without caching", async () => {
    const fetchMock = respondWith(204);
    await exchangeRecoveryToken(TOKEN);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/recovery/exchange");
    expect(url).not.toContain(TOKEN);
    expect(init).toMatchObject({ method: "POST", cache: "no-store", body: JSON.stringify({ token: TOKEN }) });
  });

  it.each([[204, "ok"], [429, "throttled"], [404, "failed"], [500, "failed"], [200, "failed"]] as const)("maps status %i to %s", async (status, result) => {
    respondWith(status);
    expect(await exchangeRecoveryToken(TOKEN)).toBe(result);
  });

  it("treats a network failure as a failed link, not an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await exchangeRecoveryToken(TOKEN)).toBe("failed");
  });

  it("has a message for every outcome that is not a success, and none of them mention the token", () => {
    expect(Object.keys(EXCHANGE_MESSAGES).sort()).toEqual(["failed", "throttled"]);
    for (const m of Object.values(EXCHANGE_MESSAGES)) expect(m).not.toContain(TOKEN);
  });
});
