import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const LIMIT = 248; // 62 * 4: bytes at or above this are dropped so no character is more likely than another

/** 10 random base62 characters. Unique-index collisions are retried by the caller. */
export function generateSlug(length = 10): string {
  let out = "";
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < LIMIT && out.length < length) out += ALPHABET[b % 62];
    }
  }
  return out;
}
