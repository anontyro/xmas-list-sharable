import Box from "@mui/material/Box";
import SectionTitle from "@/components/sticker/SectionTitle";
import LinkButton from "@/components/ui/LinkButton";
import StickerCard from "@/components/sticker/StickerCard";
import Sticker from "@/components/ui/Sticker";
import { formatGBP } from "@/lib/money";

export type PlannerSummary = { plannedMinor: number; budgetMinor: number | null };

/** The card's sentence (decision 0020): what is left of the budget, else what is planned, else an invitation. */
export function plannerStripText({ plannedMinor, budgetMinor }: PlannerSummary): string {
  if (budgetMinor !== null) {
    const left = budgetMinor - plannedMinor;
    return left < 0 ? `${formatGBP(-left)} over your ${formatGBP(budgetMinor)} budget` : `${formatGBP(left)} left to plan of ${formatGBP(budgetMinor)}`;
  }
  return plannedMinor > 0 ? `${formatGBP(plannedMinor)} planned so far` : "Start planning";
}

/** The yellow "My planner" card for a guest on the family page and the list page. */
export default function PlannerStrip({ summary }: { summary: PlannerSummary }) {
  return (
    <StickerCard component="section" tint="yellow" padded sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Sticker name="coins" width={64} />
        <div>
          <SectionTitle>My planner</SectionTitle>
          <Box component="p" sx={{ m: 0, fontWeight: 800, fontSize: 14 }}>{plannerStripText(summary)}</Box>
        </div>
      </Box>
      <LinkButton href="/planner" variant="contained" color="inherit" sx={{ flex: "1 1 160px" }}>Open planner</LinkButton>
    </StickerCard>
  );
}
