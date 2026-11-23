/** The member a sign-in link names, matched ignoring case and surrounding spaces. Null when nobody matches. */
export function findMemberByName<T extends { displayName: string }>(members: T[], name: string | undefined): T | null {
  const wanted = name?.trim().toLowerCase();
  return (wanted && members.find((m) => m.displayName.trim().toLowerCase() === wanted)) || null;
}

/**
 * `/owner/login` with the person's name (and, when given, the PIN) filled in. Used by the admin's share link.
 * The PIN goes after the `#`, which a browser never sends to the server, so it stays out of hosting and proxy logs.
 */
export function ownerLoginPath(name: string, pin?: string): string {
  return `/owner/login?${new URLSearchParams({ name })}${pin ? `#pin=${encodeURIComponent(pin)}` : ""}`;
}

/** The PIN a sign-in link carries in its fragment (`#pin=123456`), or undefined when there is none or it is not 1 to 12 digits. */
export function pinFromHash(hash: string): string | undefined {
  const pin = new URLSearchParams(hash.replace(/^#/, "")).get("pin");
  return pin && /^\d{1,12}$/.test(pin) ? pin : undefined;
}
