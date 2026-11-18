import Box from "@mui/material/Box";
import { tokens } from "@/theme/tokens";

/** A numbered step ("1  Copy your link…"): a yellow circle and the words. The number is decoration; the order of the text says it. */
export default function StepNumber({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <Box component="span" aria-hidden="true" sx={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${tokens.ink}`, borderRadius: "50%", fontFamily: "var(--font-display), sans-serif", fontSize: 15, backgroundColor: tokens.yellow }}>{n}</Box>
      <Box component="p" sx={{ m: 0, flex: 1, fontWeight: 700 }}>{children}</Box>
    </Box>
  );
}
