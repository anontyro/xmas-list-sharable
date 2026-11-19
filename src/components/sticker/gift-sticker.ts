import type { StickerName } from "@/components/ui/sticker-names";
import { hashId } from "./tint";

// Keyword groups, tried in order. Short words must match a whole word (hat, pan, toy), longer ones match the start of a word
// (sock → socks, headphone → headphones), so "what" is not a hat and "cardigan" is not a card.
const GROUPS: [StickerName, string[]][] = [
  ["stocking", ["sock", "glove", "scarf", "scarves", "hat", "beanie", "mitten"]],
  ["parcel", ["book", "novel", "cookbook"]],
  ["sparkles", ["candle", "perfume", "soap", "bath"]],
  ["box", ["mug", "cup", "dish", "pan", "kitchen"]],
  ["box", ["headphone", "charger", "speaker", "tech"]],
  ["presentgreen", ["toy", "game", "puzzle", "lego"]],
  ["gifttag", ["voucher", "card"]],
];

const RULES = GROUPS.map(([sticker, words]) => ({
  sticker,
  pattern: new RegExp(words.map((w) => (w.length <= 4 ? `\\b${w}(?:e?s)?\\b` : `\\b${w}`)).join("|"), "i"),
}));

const FALLBACK: StickerName[] = ["presentred", "presentgreen", "presentgold", "parcel", "box", "gifttag"];

/**
 * The sticker shown for a gift with no picture: from keywords in the title, else a stable pick by id.
 * Depends only on the title and id, never on reservation state, so owners can use it too.
 */
export function stickerForGift(title: string, id: string): StickerName {
  return RULES.find((r) => r.pattern.test(title))?.sticker ?? FALLBACK[hashId(id) % FALLBACK.length];
}
