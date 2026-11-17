import { describe, expect, it } from "vitest";
import { LAST_LIST_COOKIE, lastListCookie, parseLastList } from "@/lib/last-list";

describe("parseLastList", () => {
  it("accepts a 10 character letters-and-digits slug", () => {
    expect(parseLastList("a8Kp2vQx9m")).toBe("a8Kp2vQx9m");
    expect(parseLastList("0123456789")).toBe("0123456789");
  });

  it.each([
    "", "/", "..", "../etc/passwd", "a8Kp2vQx9", "a8Kp2vQx9mm", "a8Kp 2vQx9", "a8Kp2vQx9\n", "/l/a8Kp2vQx9m", "https://evil.example/l/a8Kp2vQx9m",
    "a8Kp2vQx9-", "ａ8Kp2vQx9m", "a".repeat(5000),
  ])("rejects %j", (value) => {
    expect(parseLastList(value)).toBeNull();
  });

  it("rejects things that are not strings", () => {
    for (const v of [undefined, null, 42, {}, ["a8Kp2vQx9m"]]) expect(parseLastList(v)).toBeNull();
  });
});

describe("lastListCookie", () => {
  it("is a 180 day, site-wide, lax cookie, Secure only on https", () => {
    expect(lastListCookie("a8Kp2vQx9m", false)).toBe(`${LAST_LIST_COOKIE}=a8Kp2vQx9m; Path=/; Max-Age=15552000; SameSite=Lax`);
    expect(lastListCookie("a8Kp2vQx9m", true)).toMatch(/; Secure$/);
  });

  it("refuses to write anything that is not a slug, so a cookie can't be split or injected", () => {
    expect(() => lastListCookie("x; Path=/admin", false)).toThrow();
    expect(() => lastListCookie("", false)).toThrow();
  });
});
