/** Whole days from today's London calendar date to the coming 25 December: 0 on the day, null after it (decision 0020). */
export function daysUntilChristmas(now: Date): number | null {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const [y, m, d] = [get("year"), get("month"), get("day")];
  // Calendar dates as UTC midnights, so a clock change never adds or removes an hour from the count.
  const days = (Date.UTC(y, 11, 25) - Date.UTC(y, m - 1, d)) / 86_400_000;
  return days < 0 ? null : days;
}
