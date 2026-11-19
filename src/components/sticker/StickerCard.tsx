import Card from "@mui/material/Card";
import type { SxProps, Theme } from "@mui/material/styles";
import { tokens } from "@/theme/tokens";
import { TINT_COLOR, type CardTint } from "./tint";

type Props = {
  tint?: CardTint;
  /** Roomier padding (16 px) for the big cards; the default is 12 px. */
  padded?: boolean;
  component?: React.ElementType;
  /** Names a `section` so it is a landmark region. */
  "aria-label"?: string;
  sx?: SxProps<Theme>;
  children: React.ReactNode;
};

/** The design's card: ink border and hard shadow come from the theme; this adds the tint and padding. `cream` is the dashed, flat card. */
export default function StickerCard({ tint = "white", padded, component = "div", sx, children, "aria-label": ariaLabel }: Props) {
  const base = {
    p: padded ? 2 : "12px",
    backgroundColor: TINT_COLOR[tint],
    color: tokens.ink,
    ...(tint === "cream" ? { borderStyle: "dashed", boxShadow: "none" } : {}),
  };
  return (
    <Card component={component} aria-label={ariaLabel} sx={[base, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {children}
    </Card>
  );
}
