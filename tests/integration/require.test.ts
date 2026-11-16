import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { household } from "@/db/schema";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { requireAdmin, requireGuest, requireOwner } from "@/lib/auth/require";
import { createSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/result";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);

beforeEach(resetRequest);

describe("guards", () => {
  it("requireOwner accepts only the owner session of that member", async () => {
    const { token } = await createSession("owner", "11111111-1111-1111-1111-111111111111");
    cookieJar.set(COOKIE_NAMES.owner, token);
    await expect(requireOwner("11111111-1111-1111-1111-111111111111")).resolves.toBeTruthy();
    await expect(requireOwner("22222222-2222-2222-2222-222222222222")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("does not accept a guest or admin token in the owner cookie", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    for (const type of ["guest", "admin"] as const) {
      cookieJar.set(COOKIE_NAMES.owner, (await createSession(type, h.id)).token);
      await expect(requireOwner(h.id)).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });

  it("requireAdmin and requireGuest throw with no session and pass with the right one", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireGuest()).rejects.toBeInstanceOf(UnauthorizedError);
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    await expect(requireAdmin()).resolves.toBeUndefined();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", h.id)).token);
    await expect(requireGuest()).resolves.toMatchObject({ type: "guest" });
  });

  it("an admin cookie does not make someone a guest", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    await expect(requireGuest()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
