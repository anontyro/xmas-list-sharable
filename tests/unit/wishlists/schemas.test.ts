import { describe, expect, it } from "vitest";
import { fieldErrors, itemInput } from "@/features/wishlists/schemas";

const ok = (input: object) => itemInput.safeParse(input);

describe("itemInput", () => {
  it("accepts a title only, with null extras and the default priority", () => {
    const r = ok({ title: "Book" });
    expect(r.success && r.data).toEqual({ title: "Book", description: null, productUrl: null, imageUrl: null, priceMinor: null, priority: "would_love" });
  });
  it("treats empty form fields as missing", () => {
    const r = ok({ title: "Book", description: "", productUrl: "", imageUrl: "", price: "" });
    expect(r.success && r.data.priceMinor).toBeNull();
  });
  it("rejects an empty or 121-character title", () => {
    expect(ok({ title: "   " }).success).toBe(false);
    expect(ok({ title: "x".repeat(121) }).success).toBe(false);
    expect(ok({ title: "x".repeat(120) }).success).toBe(true);
  });
  it("only allows http and https links", () => {
    for (const bad of ["javascript:alert(1)", "ftp://x.com", "data:text/html,hi", "not a url"]) {
      expect(ok({ title: "t", productUrl: bad }).success, bad).toBe(false);
      expect(ok({ title: "t", imageUrl: bad }).success, bad).toBe(false);
    }
    expect(ok({ title: "t", productUrl: "https://shop.example/p?id=1" }).success).toBe(true);
    expect(ok({ title: "t", productUrl: "http://shop.example" }).success).toBe(true);
  });
  it("turns prices into pence and rejects bad ones", () => {
    const r = ok({ title: "t", price: "19.99" });
    expect(r.success && r.data.priceMinor).toBe(1999);
    for (const bad of ["1e3", "-5", "abc", "1.234"]) expect(ok({ title: "t", price: bad }).success, bad).toBe(false);
  });
  it("rejects an unknown priority", () => {
    expect(ok({ title: "t", priority: "urgent" }).success).toBe(false);
  });
  it("reports the first message per field", () => {
    const r = ok({ title: "", price: "x", productUrl: "nope" });
    expect(!r.success && Object.keys(fieldErrors(r.error)).sort()).toEqual(["price", "productUrl", "title"]);
  });
});
