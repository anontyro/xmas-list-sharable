import Box from "@mui/material/Box";
import { tokens } from "@/theme/tokens";

export type MeterSegment = { percent: number; tone: "green" | "red" | "yellow" | "sky" };
const COLOR = { green: tokens.green, red: tokens.red, yellow: tokens.yellow, sky: tokens.sky };

/** Shares of a whole as one bar. The picture has no text, so `label` says it in words (required). Segments never add up past 100%. */
export default function Meter({ segments, label }: { segments: MeterSegment[]; label: string }) {
  const widths = segments.reduce<number[]>((acc, s) => {
    const used = acc.reduce((sum, w) => sum + w, 0);
    acc.push(Math.max(0, Math.min(Number.isFinite(s.percent) ? s.percent : 0, 100 - used)));
    return acc;
  }, []);
  return (
    <Box role="img" aria-label={label} sx={{ display: "flex", height: 22, border: `3px solid ${tokens.ink}`, borderRadius: "12px", overflow: "hidden", backgroundColor: tokens.white }}>
      {segments.map((s, i) => (
        <Box key={i} data-meter-segment style={{ width: `${widths[i]}%` }} sx={{ backgroundColor: COLOR[s.tone], ...(i > 0 && widths[i] > 0 ? { borderLeft: `3px solid ${tokens.ink}` } : {}) }} />
      ))}
    </Box>
  );
}
