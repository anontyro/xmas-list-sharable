import { describe, expect, it } from "vitest";
import { hashPin, InvalidPinError, verifyPin } from "@/lib/security/password";

describe("PIN hashing", () => {
  it("verifies the right PIN and rejects another", async () => {
    const h = await hashPin("123456");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPin("123456", h)).toBe(true);
    expect(await verifyPin("123457", h)).toBe(false);
  });
  it("salts, so the same PIN hashes differently", async () => {
    expect(await hashPin("123456")).not.toBe(await hashPin("123456"));
  });
  it("rejects short, long and non-numeric PINs", async () => {
    for (const bad of ["12345", "1234567890123", "abcdef", "12 456", ""]) {
      await expect(hashPin(bad)).rejects.toBeInstanceOf(InvalidPinError);
    }
  });
  it("treats a malformed stored hash as a failed login", async () => {
    expect(await verifyPin("123456", "not-a-hash")).toBe(false);
  });
});
