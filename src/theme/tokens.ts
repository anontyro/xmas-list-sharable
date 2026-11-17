/** The Sticker Book design tokens (docs/family-gifts-design/README.md). The only place a colour value is written. */
export const tokens = {
  ink: "#1F2A44",
  cream: "#FFF4D6",
  red: "#D32F34",
  green: "#1F7A45",
  yellow: "#FFC93C",
  pink: "#FFB3C1",
  sky: "#BDE0FE",
  mint: "#7ED9A5",
  muted: "#4A5570",
  white: "#FFFFFF",
  /** Sign-out red (screen 12); darker than `red` so it reads as a warning on white. */
  danger: "#B3262B",
} as const;

export type TokenName = keyof typeof tokens;

/** Hard offset shadows: cards sit on `4px 4px 0`, buttons on `0 3px 0`. */
export const shadows = {
  card: `4px 4px 0 ${tokens.ink}`,
  button: `0 3px 0 ${tokens.ink}`,
  buttonPressed: `0 1px 0 ${tokens.ink}`,
  ribbon: `2px 2px 0 ${tokens.ink}`,
} as const;

/** The sticker look: a white outline on all four sides plus a soft drop shadow, as a CSS filter (the design's `.stk`). */
export const stickerOutline = [
  `drop-shadow(2px 0 0 ${tokens.white})`,
  `drop-shadow(-2px 0 0 ${tokens.white})`,
  `drop-shadow(0 2px 0 ${tokens.white})`,
  `drop-shadow(0 -2px 0 ${tokens.white})`,
  "drop-shadow(2px 3px 0 rgba(31,42,68,.35))",
].join(" ");

/** The faint dot grid on the cream page. */
export const dotGrid = {
  backgroundColor: tokens.cream,
  backgroundImage: "radial-gradient(rgba(31,42,68,.08) 2px, transparent 2.5px)",
  backgroundSize: "26px 26px",
} as const;

/** The design's two layout modes switch at 860 px. */
export const DESKTOP_PX = 860;

/** Class that marks the red top bar, so the focus ring can switch to cream there. */
export const RED_BAR_CLASS = "fg-bar";
