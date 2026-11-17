// The 36 Sticker Book icons in public/stickers/<name>.png, each with its natural [width, height] in pixels
// (read from the PNG headers and checked by tests/unit/sticker.test.ts), so a sticker keeps its shape at any width.
export const STICKERS = {
  adult: [107, 93],
  badge: [116, 98],
  bag: [139, 107],
  basket: [156, 127],
  bookmark: [90, 111],
  box: [152, 134],
  calendar: [136, 107],
  candycane: [115, 128],
  chart: [122, 117],
  checklist: [102, 99],
  child: [106, 97],
  clock: [101, 91],
  coins: [132, 98],
  download: [67, 76],
  family: [140, 103],
  gifttag: [108, 129],
  gingerbread: [132, 131],
  heartbadge: [70, 60],
  heartlist: [102, 108],
  holly: [143, 123],
  parcel: [148, 128],
  pencil: [74, 72],
  presentgold: [140, 134],
  presentgreen: [136, 133],
  presentred: [130, 137],
  reindeer: [138, 84],
  saletag: [124, 112],
  santahat: [133, 94],
  share: [67, 54],
  snowflake: [126, 132],
  snowglobe: [122, 103],
  sparkles: [129, 117],
  star: [130, 111],
  stocking: [114, 120],
  tree: [135, 114],
  wallet: [138, 98],
} as const;

export type StickerName = keyof typeof STICKERS;

export const STICKER_NAMES = Object.keys(STICKERS) as StickerName[];
