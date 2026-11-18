import Box from "@mui/material/Box";
import Meter from "@/components/sticker/Meter";
import Note from "@/components/sticker/Note";
import Stat from "@/components/sticker/Stat";
import StickerCard from "@/components/sticker/StickerCard";
import LinkButton from "@/components/ui/LinkButton";
import { formatGBP } from "@/lib/money";
import type { PlanTotals } from "../accounting";
import { meterSegments } from "../meter";
import type { Period } from "../schemas";
import { budgetHref } from "./RecipientCard";

/** The yellow total card (decision 0021). Every figure is `computePlan`'s; the only sums here are for the words. */
export default function BudgetCard({ title, totals, budgetMinor, period }: { title: string; totals: PlanTotals; budgetMinor: number | null; period: Period }) {
  const shares = meterSegments({ budgetMinor, spentMinor: totals.spentMinor, plannedMinor: totals.plannedMinor });
  const left = totals.remainingMinor;
  const notCounted = [
    totals.potentialMinor > 0 ? `Interested gifts (${formatGBP(totals.potentialMinor)}) aren't counted until you reserve them.` : "",
    totals.unpricedCount > 0 ? `${totals.unpricedCount} ${totals.unpricedCount === 1 ? "item" : "items"} without a price (not counted).` : "",
  ].filter(Boolean);
  return (
    <StickerCard component="section" tint="yellow" padded sx={{ display: "flex", flexDirection: "column", gap: "8px" }} aria-label={title}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <Box component="h2" sx={{ m: 0, fontSize: 14, fontWeight: 800 }}>Total budget</Box>
        <LinkButton href={budgetHref(period)} size="small" color="inherit" variant="contained">{budgetMinor === null ? "Set budget" : "Edit budget"}</LinkButton>
      </Box>
      <Box component="p" sx={{ m: 0, fontFamily: "var(--font-display), sans-serif", fontSize: 34, lineHeight: 1 }}>{budgetMinor === null ? "No budget yet" : formatGBP(budgetMinor)}</Box>
      {shares && budgetMinor !== null ? (
        <Meter
          label={`${formatGBP(totals.spentMinor)} spent and ${formatGBP(Math.max(0, totals.plannedMinor - totals.spentMinor))} more planned out of ${formatGBP(budgetMinor)}`}
          segments={[{ percent: shares.spentPercent, tone: "green" }, { percent: shares.plannedPercent, tone: "red" }]}
        />
      ) : (
        <Box component="p" sx={{ m: 0, fontWeight: 700, fontSize: 14 }}>Set a budget to see how much is left.</Box>
      )}
      <Box sx={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
        <Stat label="Planned" value={formatGBP(totals.plannedMinor)} />
        <Stat label="Spent" value={formatGBP(totals.spentMinor)} tint="mint" />
        <Stat label="Left" value={left === null ? "No budget" : left < 0 ? `${formatGBP(-left)} over` : formatGBP(left)} tint="pink" />
      </Box>
      {notCounted.length > 0 && <Note sticker="sparkles"><p>{notCounted.join(" ")}</p></Note>}
    </StickerCard>
  );
}
