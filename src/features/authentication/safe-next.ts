const SLUG_PATH = /^\/l\/[0-9A-Za-z]{10}(?:\?[A-Za-z0-9_.~%&=,+:@!*'()-]*)?$/;
const FIXED = new Set(["/", "/planner", "/access"]);
const MAX = 300;

/**
 * Where to go after the welcome screen. Only a few of the app's own pages are allowed (home, planner, access, or one list with an
 * optional query); anything else, including other sites, protocol-relative `//host` and backslash tricks, becomes "/".
 */
export function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > MAX) return "/";
  return FIXED.has(raw) || SLUG_PATH.test(raw) ? raw : "/";
}
