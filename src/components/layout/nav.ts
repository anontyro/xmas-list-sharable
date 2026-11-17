import type { StickerName } from "@/components/ui/sticker-names";

/** One destination, shown as a top-bar link from 860 px and as a bottom tab below it. */
export type NavItem = {
  label: string;
  /** A shorter label for the bottom tab ("Planner" for "My planner"). */
  tabLabel?: string;
  href: string;
  sticker: StickerName;
  /** Paths that make this item the current one: "/" matches only the home page, others match themselves and anything beneath. */
  match: string[];
};

/** Whether `pathname` is on one of the item's paths. */
export function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(m.endsWith("/") ? m : `${m}/`)));
}
