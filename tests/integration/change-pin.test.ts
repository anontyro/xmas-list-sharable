import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, requestHeaders, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { household, member } from "@/db/schema";
import { changeOwnPin, ownerLogin } from "@/features/authentication/owner-login";
import { setOwnerPin } from "@/features/family/actions";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { getSession } from "@/lib/auth/session";
import { createSession } from "@/lib/auth/session";
import { hashPin } from "@/lib/security/password";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  resetRequest();
  requestHeaders.set("x-forwarded-for", "1.2.3.4");
});

async function alex() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex", pinHash: await hashPin("123456"), approvedAt: new Date() }).returning();
  return { h, id: m.id };
}
const signedIn = async (id: string) => cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", id)).token);

describe("changeOwnPin", () => {
  it("changes the PIN, ends other sessions, and keeps this browser signed in", async () => {
    const { id } = await alex();
    const otherDevice = (await createSession("owner", id)).token;
    await signedIn(id);
    const before = cookieJar.get(COOKIE_NAMES.owner)!;

    expect((await changeOwnPin("123456", "654321")).ok).toBe(true);

    expect(await getSession("owner", otherDevice)).toBeNull();
    expect(await getSession("owner", before)).toBeNull();
    expect(await getSession("owner", cookieJar.get(COOKIE_NAMES.owner)!)).toEqual({ principalType: "owner", principalId: id });
    resetRequest();
    expect((await ownerLogin(id, "123456")).ok).toBe(false);
    expect((await ownerLogin(id, "654321")).ok).toBe(true);
  });

  it("needs the current PIN, a valid new PIN and a signed-in owner", async () => {
    const { id } = await alex();
    expect(await changeOwnPin("123456", "654321")).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    await signedIn(id);
    expect(await changeOwnPin("000000", "654321")).toMatchObject({ error: { code: "LOGIN_FAILED" } });
    expect(await changeOwnPin("123456", "12345")).toMatchObject({ error: { code: "INVALID" } });
    expect(await changeOwnPin("123456", "abcdef")).toMatchObject({ error: { code: "INVALID" } });
    expect((await ownerLogin(id, "123456")).ok).toBe(true); // nothing changed
  });

  it("counts wrong current PINs against the sign-in throttle", async () => {
    const { id } = await alex();
    await signedIn(id);
    for (let i = 0; i < 5; i++) await changeOwnPin("000000", "654321");
    expect(await changeOwnPin("123456", "654321")).toMatchObject({ ok: false });
    expect((await ownerLogin(id, "123456")).ok).toBe(false); // the same address is blocked from signing in too
  });

  it("leaves the admin able to set a new PIN afterwards", async () => {
    const { id } = await alex();
    await signedIn(id);
    await changeOwnPin("123456", "654321");
    resetRequest();
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", id)).token);
    expect((await setOwnerPin(id, "111111")).ok).toBe(true);
    resetRequest();
    expect((await ownerLogin(id, "654321")).ok).toBe(false);
    expect((await ownerLogin(id, "111111")).ok).toBe(true);
  });
});
