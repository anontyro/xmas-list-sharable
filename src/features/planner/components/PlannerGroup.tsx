import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ClaimControls from "@/features/reservations/components/ClaimControls";
import StatusChip from "@/features/reservations/components/StatusChip";
import type { GuestItemState } from "@/features/reservations/guest-claim-view";
import { formatGBP } from "@/lib/money";
import type { PlannerEntry, PlannerGroup as Group } from "../queries";
import EntryNotes from "./EntryNotes";
import { EntrySelect } from "./SelectionContext";
import TotalsPanel from "./TotalsPanel";

const asGuestState = (e: PlannerEntry): GuestItemState => ({ state: e.state === "interested" ? "interested" : `${e.state}_by_you` });

/** One recipient: their budget and totals, then the guest's entries for them. */
export default function PlannerGroup({ group }: { group: Group }) {
  return (
    <Stack component="section" aria-label={group.memberName} spacing={2}>
      <Typography variant="h5" component="h2">{group.memberName}</Typography>
      <TotalsPanel title={`Spending on ${group.memberName}`} totals={group.totals} budgetMinor={group.budgetMinor} />
      {group.entries.map((e) => {
        const state = asGuestState(e);
        return (
          <Paper key={e.itemId} sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="subtitle1" component="h3" sx={{ flexGrow: 1, overflowWrap: "anywhere" }}>{e.title}</Typography>
                <StatusChip state={state} />
                {e.removed && <Chip size="small" label="Removed by the owner" />}
                {!e.included && <Chip size="small" variant="outlined" label="Not in totals" />}
              </Stack>
              <Typography>
                {e.listedPriceMinor === null ? "No price" : formatGBP(e.listedPriceMinor)}
                {e.actualPriceMinor !== null && ` · you paid ${formatGBP(e.actualPriceMinor)}`}
              </Typography>
              {e.productUrl && !e.removed && <Link href={e.productUrl} target="_blank" rel="noopener noreferrer nofollow">View product</Link>}
              <EntrySelect itemId={e.itemId} title={e.title} />
              <ClaimControls itemId={e.itemId} itemTitle={e.title} state={state.state} />
              <EntryNotes itemId={e.itemId} title={e.title} note={e.note} actualPriceMinor={e.actualPriceMinor} included={e.included} canEnterPrice={e.state !== "interested"} />
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
