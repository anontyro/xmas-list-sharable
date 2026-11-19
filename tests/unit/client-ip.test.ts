import { beforeEach, describe, expect, it, vi } from "vitest";

const sent = new Map<string, string>();
vi.mock("next/headers", () => ({ headers: async () => ({ get: (name: string) => sent.get(name.toLowerCase()) ?? null }) }));

import { clientIp } from "@/lib/security/client-ip";

beforeEach(() => sent.clear());

describe("clientIp", () => {
  it("prefers x-real-ip", () => {
    sent.set("x-real-ip", " 5.6.7.8 ");
    sent.set("x-forwarded-for", "1.1.1.1");
    return expect(clientIp()).resolves.toBe("5.6.7.8");
  });

  it("without x-real-ip uses the last x-forwarded-for entry, so a caller cannot choose their own", async () => {
    sent.set("x-forwarded-for", "6.6.6.6, 7.7.7.7, 1.2.3.4");
    expect(await clientIp()).toBe("1.2.3.4");
    sent.set("x-forwarded-for", "9.9.9.9");
    expect(await clientIp()).toBe("9.9.9.9");
  });

  it("gives every spoofed first entry the same answer", async () => {
    const seen = new Set<string>();
    for (const fake of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) {
      sent.set("x-forwarded-for", `${fake}, 1.2.3.4`);
      seen.add(await clientIp());
    }
    expect(seen).toEqual(new Set(["1.2.3.4"]));
  });

  it("is 'unknown' with no usable header", async () => {
    expect(await clientIp()).toBe("unknown");
    sent.set("x-forwarded-for", " , ");
    expect(await clientIp()).toBe("unknown");
    sent.set("x-real-ip", "   ");
    expect(await clientIp()).toBe("unknown");
  });
});
