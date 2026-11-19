const TOKEN = "[A-Za-z0-9_-]{43}"; // 32 random bytes as base64url (see lib/security/token.ts)
const BARE = new RegExp(`^${TOKEN}$`);
const LINK = new RegExp(`^(?:https?://[^\\s/#?]+)?/recover#t=(${TOKEN})$`);
const MAX = 2000;

/**
 * The recovery token in what someone pasted: the full link (`https://host/recover#t=…`), the path without a host, or the bare token.
 * Surrounding spaces and line breaks are fine. Anything else (prose around a link, another fragment, a token of the wrong length) is null,
 * so a guess can't be turned into a request.
 */
export function tokenFromPastedLink(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const pasted = text.trim();
  if (pasted.length > MAX) return null;
  if (BARE.test(pasted)) return pasted;
  return LINK.exec(pasted)?.[1] ?? null;
}
