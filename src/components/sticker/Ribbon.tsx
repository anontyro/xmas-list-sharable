import Box from "@mui/material/Box";
import { shadows, tokens } from "@/theme/tokens";

export type RibbonTone = "white" | "red" | "green" | "yellow" | "sky";
const BG: Record<RibbonTone, string> = { white: tokens.white, red: tokens.red, green: tokens.green, yellow: tokens.yellow, sky: tokens.sky };

/** A tilted section label ("MOST WANTED"). Text only, so it reads normally to a screen reader; put any star in `aria-hidden`. */
export default function Ribbon({ tone = "white", children }: { tone?: RibbonTone; children: React.ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        alignSelf: "flex-start",
        px: "12px",
        py: "2px",
        border: `3px solid ${tokens.ink}`,
        borderRadius: "10px",
        boxShadow: shadows.ribbon,
        transform: "rotate(-1.5deg)",
        fontFamily: "var(--font-display), sans-serif",
        fontSize: 16,
        color: tone === "red" || tone === "green" ? tokens.white : tokens.ink,
        backgroundColor: BG[tone],
      }}
    >
      {children}
    </Box>
  );
}
