/** The member a sign-in link names, matched ignoring case and surrounding spaces. Null when nobody matches. */
export function findMemberByName<T extends { displayName: string }>(members: T[], name: string | undefined): T | null {
  const wanted = name?.trim().toLowerCase();
  return (wanted && members.find((m) => m.displayName.trim().toLowerCase() === wanted)) || null;
}

/** `/owner/login` with the person's name (and, when given, the PIN) filled in. Used by the admin's share link. */
export function ownerLoginPath(name: string, pin?: string): string {
  const q = new URLSearchParams({ name });
  if (pin) q.set("pin", pin);
  return `/owner/login?${q}`;
}
