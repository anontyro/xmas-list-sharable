const MAX_MINOR = 99_999_999; // £999,999.99

/** Parses "12", "12.5" or "12.50" pounds into integer pence. Returns null for anything else. */
export function parsePoundsToMinor(input: string): number | null {
  const m = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  const minor = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return minor <= MAX_MINOR ? minor : null;
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatGBP(minor: number): string {
  return gbp.format(minor / 100);
}
