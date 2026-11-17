/** Cookie that remembers the last list a guest opened, for the "Wishlist" shortcut. Not secret: it is a list they already viewed. */
export const LAST_LIST_COOKIE = "fg_last_list";

const SLUG = /^[0-9A-Za-z]{10}$/;
const DAYS = 180;

/** The slug if it has the shape of a list slug, else null. Anything else in the cookie (a path, a URL, junk) is ignored. */
export function parseLastList(value: unknown): string | null {
  return typeof value === "string" && SLUG.test(value) ? value : null;
}

/** The `document.cookie` string for remembering `slug` (non-HttpOnly so the page can write it; Secure on https). */
export function lastListCookie(slug: string, secure: boolean): string {
  const safe = parseLastList(slug);
  if (!safe) throw new Error("Not a list slug");
  return `${LAST_LIST_COOKIE}=${safe}; Path=/; Max-Age=${DAYS * 86_400}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
