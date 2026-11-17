import { describe, expect, it } from "vitest";
import { tokenFromPastedLink } from "@/features/authentication/recovery-link";
import { newToken } from "@/lib/security/token";

const T = "k9ZtQ4x7mWvB2LpR8cNd5hYeA1sFgJ3uXoVi6Tq0wZb"; // 43 characters

describe("tokenFromPastedLink", () => {
  it("uses a sample token of the right length", () => expect(T).toHaveLength(43));

  it("reads the token from a full link, from the path alone, and from the bare token", () => {
    expect(tokenFromPastedLink(`https://familygifts.example/recover#t=${T}`)).toBe(T);
    expect(tokenFromPastedLink(`http://localhost:3217/recover#t=${T}`)).toBe(T);
    expect(tokenFromPastedLink(`/recover#t=${T}`)).toBe(T);
    expect(tokenFromPastedLink(T)).toBe(T);
  });

  it("ignores surrounding spaces and line breaks", () => {
    expect(tokenFromPastedLink(`  https://x.example/recover#t=${T}\n`)).toBe(T);
    expect(tokenFromPastedLink(`\r\n${T}\r\n`)).toBe(T);
  });

  it("accepts a real token as made by the app", () => {
    const token = newToken();
    expect(tokenFromPastedLink(`https://x.example/recover#t=${token}`)).toBe(token);
    expect(tokenFromPastedLink(token)).toBe(token);
  });

  it.each([
    ["an empty string", ""],
    ["only spaces", "   \n "],
    ["a different fragment", `https://x.example/recover#k=${T}`],
    ["a different page", `https://x.example/planner#t=${T}`],
    ["no fragment", "https://x.example/recover"],
    ["a token that is too short", T.slice(0, 42)],
    ["a token that is too long", `${T}A`],
    ["extra characters after the token in a link", `https://x.example/recover#t=${T}extra`],
    ["a token with a character outside base64url", `${T.slice(0, 42)}+`],
    ["a token in the middle of prose", `Here is my link https://x.example/recover#t=${T} thanks`],
    ["a bare token inside a sentence", `my token is ${T}.`],
    ["a link with a query before the fragment", `https://x.example/recover?x=1#t=${T}`],
    ["two links", `https://x.example/recover#t=${T}\nhttps://x.example/recover#t=${T}`],
    ["a link to another scheme", `javascript:/recover#t=${T}`],
    ["a protocol-relative link", `//x.example/recover#t=${T}`],
  ])("returns null for %s", (_label, text) => {
    expect(tokenFromPastedLink(text)).toBeNull();
  });

  it("returns null for anything that is not a string, and for huge input", () => {
    for (const v of [undefined, null, 42, {}, [T]]) expect(tokenFromPastedLink(v)).toBeNull();
    expect(tokenFromPastedLink(`https://x.example/recover#t=${T}${" ".repeat(3000)}x`)).toBeNull();
    expect(tokenFromPastedLink("a".repeat(100_000))).toBeNull();
  });
});
