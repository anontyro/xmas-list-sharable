import Box from "@mui/material/Box";
import { tokens } from "@/theme/tokens";
import { TINT_COLOR, type Tint } from "./tint";

/** A small figure with a caption (Planned, Spent, Left). */
export default function Stat({ label, value, tint }: { label: string; value: string; tint?: Tint }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, border: `3px solid ${tokens.ink}`, borderRadius: "12px", px: 1, py: "4px", backgroundColor: TINT_COLOR[tint ?? "white"], color: tokens.ink }}>
      <Box component="p" sx={{ m: 0, fontSize: 11, fontWeight: 800, color: tint ? tokens.ink : tokens.muted }}>{label}</Box>
      <Box component="p" sx={{ m: 0, fontFamily: "var(--font-display), sans-serif", fontSize: 19, lineHeight: 1.15 }}>{value}</Box>
    </Box>
  );
}
