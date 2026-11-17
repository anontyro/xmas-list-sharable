/** Query parameters that only track where a visitor came from, so they do not make two links "different". */
const TRACKING = /^(utm_.*|fbclid|gclid|msclkid|mc_cid|mc_eid)$/i;

/** A comparable form of a product URL: lower-case host, no fragment, no tracking parameters, sorted query, no trailing slash. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
    u.search = "";
    for (const [k, v] of keep) u.searchParams.append(k, v);
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname;
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch {
    return raw.trim();
  }
}

/** The existing item whose link matches `url` once both are normalised, or null. */
export function findDuplicate<T extends { productUrl: string | null }>(url: string, existing: T[]): T | null {
  const target = normalizeUrl(url);
  return existing.find((e) => e.productUrl !== null && normalizeUrl(e.productUrl) === target) ?? null;
}
