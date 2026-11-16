import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { formatGBP } from "@/lib/money";
import type { PlanTotals } from "../accounting";

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" component="p">{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  );
}

/** Shows numbers computed by computePlan; nothing is added up here. */
export default function TotalsPanel({ totals, budgetMinor, title }: { totals: PlanTotals; budgetMinor: number | null; title: string }) {
  const remaining = totals.remainingMinor;
  return (
    <Paper component="section" aria-label={title} sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>{title}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2 }}>
        <Figure label="Planned" value={formatGBP(totals.plannedMinor)} hint="Reserved and bought" />
        <Figure label="Spent" value={formatGBP(totals.spentMinor)} hint="Bought so far" />
        <Figure label="Might spend" value={formatGBP(totals.potentialMinor)} hint="Interested only" />
        <Figure
          label="Remaining"
          value={remaining === null ? "No budget set" : remaining < 0 ? `${formatGBP(-remaining)} over budget` : formatGBP(remaining)}
          hint={budgetMinor === null ? undefined : `of ${formatGBP(budgetMinor)}`}
        />
      </Box>
      {totals.unpricedCount > 0 && (
        <Typography sx={{ mt: 2 }} color="text.secondary">
          {totals.unpricedCount} {totals.unpricedCount === 1 ? "item" : "items"} without a price (not in the totals)
        </Typography>
      )}
    </Paper>
  );
}
