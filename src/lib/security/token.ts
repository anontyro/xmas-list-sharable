import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 random bytes as 43 base64url characters. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored; the raw token lives in the cookie or link. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time string comparison (digests first, so lengths never leak). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
