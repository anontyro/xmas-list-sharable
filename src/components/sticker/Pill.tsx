import Box from "@mui/material/Box";
import { tokens } from "@/theme/tokens";
import { TINT_COLOR, type Tint } from "./tint";

/** The small status label (screen 04: "Available", "Reserved by Sam"). The meaning is in the text; the tint only reinforces it. */
export default function Pill({ tone, children }: { tone?: Tint; children: React.ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: "9px",
        py: "1px",
        border: `2px solid ${tokens.ink}`,
        borderRadius: "12px",
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1.5,
        color: tokens.ink,
        backgroundColor: TINT_COLOR[tone ?? "white"],
      }}
    >
      {children}
    </Box>
  );
}
