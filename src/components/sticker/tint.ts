import { tokens } from "@/theme/tokens";

/** The four pastel tints a person or gift can have. */
export const TINTS = ["yellow", "pink", "mint", "sky"] as const;
export type Tint = (typeof TINTS)[number];
/** Card backgrounds: white, a tint, or the cream dashed "ghost" card. */
export type CardTint = "white" | Tint | "cream";

export const TINT_COLOR: Record<CardTint, string> = {
  white: tokens.white,
  cream: tokens.cream,
  yellow: tokens.yellow,
  pink: tokens.pink,
  mint: tokens.mint,
  sky: tokens.sky,
};

/** FNV-1a: a small, stable string hash, so the same id always lands in the same place. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** The same person or gift always gets the same tint. */
export const tintFor = (id: string): Tint => TINTS[hashId(id) % TINTS.length];
