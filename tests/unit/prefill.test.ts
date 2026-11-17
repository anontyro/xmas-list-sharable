import { describe, expect, it } from "vitest";
import { findMemberByName, ownerLoginPath } from "@/features/authentication/prefill";

const members = [{ displayName: "Alex" }, { displayName: "Sarah Jane" }];

describe("sign-in link helpers", () => {
  it("finds a member ignoring case and spaces, and never guesses", () => {
    expect(findMemberByName(members, "alex")).toBe(members[0]);
    expect(findMemberByName(members, "  SARAH JANE ")).toBe(members[1]);
    expect(findMemberByName(members, "sar")).toBeNull();
    expect(findMemberByName(members, "")).toBeNull();
    expect(findMemberByName(members, undefined)).toBeNull();
  });

  it("builds an escaped path, with the PIN only when given", () => {
    expect(ownerLoginPath("Alex")).toBe("/owner/login?name=Alex");
    expect(ownerLoginPath("Sarah Jane", "123456")).toBe("/owner/login?name=Sarah+Jane&pin=123456");
    expect(ownerLoginPath("A&B=C", "1")).toBe("/owner/login?name=A%26B%3DC&pin=1");
  });
});
