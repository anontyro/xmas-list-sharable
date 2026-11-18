import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Ribbon, { type RibbonTone } from "@/components/sticker/Ribbon";
import StickerCard from "@/components/sticker/StickerCard";
import { tintFor, type Tint } from "@/components/sticker/tint";
import { tokens } from "@/theme/tokens";
import LinkButton from "@/components/ui/LinkButton";
import ClaimControls from "@/features/reservations/components/ClaimControls";
import StatusChip from "@/features/reservations/components/StatusChip";
import type { GuestItemState } from "@/features/reservations/guest-claim-view";
import { formatGBP } from "@/lib/money";
import type { Period } from "../schemas";
import type { PlannerEntry, PlannerGroup } from "../queries";
import { EntrySelect } from "./SelectionContext";

const RIBBON: Record<Tint, RibbonTone> = { yellow: "yellow", pink: "red", mint: "green", sky: "sky" };
const asGuestState = (e: PlannerEntry): GuestItemState => ({ state: e.state === "interested" ? "interested" : `${e.state}_by_you` });

/** `href` to the Budget and notes page for one gift, keeping the period being looked at. */
export const budgetHref = ({ occasion, year }: Period, itemId?: string) =>
  `/planner/budget?occasion=${encodeURIComponent(occasion)}&year=${year}${itemId ? `&gift=${itemId}` : ""}`;

/** One recipient: a ribbon with their budget, then the guest's gifts for them, each with its private note. */
export default function RecipientCard({ group, period }: { group: PlannerGroup; period: Period }) {
  return (
    <StickerCard component="section" padded sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", mb: "6px" }}>
        <Box component="h2" sx={{ m: 0 }}>
          <Ribbon tone={RIBBON[tintFor(group.memberId)]}>{group.memberName.toUpperCase()}</Ribbon>
        </Box>
        {group.budgetMinor !== null && <Box component="p" sx={{ m: 0, fontWeight: 800, fontSize: 13, color: "text.secondary" }}>Budget {formatGBP(group.budgetMinor)}</Box>}
      </Box>
      {group.entries.map((e) => {
        const state = asGuestState(e);
        return (
          <Box key={e.itemId} sx={{ display: "flex", flexDirection: "column", gap: "6px", py: "8px", borderBottom: `2px dashed ${tokens.muted}`, "&:last-child": { borderBottom: 0 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <EntrySelect itemId={e.itemId} title={e.title} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box component="h3" sx={{ m: 0, fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" }}>{e.title}</Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                  <StatusChip state={state} />
                  {e.actualPriceMinor !== null && <Box component="span" sx={{ fontSize: 12, fontWeight: 800 }}>paid {formatGBP(e.actualPriceMinor)}</Box>}
                  {e.removed && <Box component="span" sx={{ fontSize: 12, fontWeight: 800 }}>Removed by the owner</Box>}
                  {!e.included && <Box component="span" sx={{ fontSize: 12, fontWeight: 800 }}>Not in totals</Box>}
                </Box>
              </Box>
              <Box component="p" sx={{ m: 0, fontFamily: "var(--font-display), sans-serif", fontSize: 18, color: e.state === "interested" ? "text.secondary" : undefined }}>
                {e.listedPriceMinor === null ? "No price" : formatGBP(e.listedPriceMinor)}
              </Box>
            </Box>
            {e.productUrl && !e.removed && <Link href={e.productUrl} target="_blank" rel="noopener noreferrer nofollow" sx={{ ml: "42px" }}>View product</Link>}
            <Box sx={{ ml: "42px" }}><ClaimControls itemId={e.itemId} itemTitle={e.title} state={state.state} /></Box>
            <StickerCard tint="cream" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", py: "8px", px: "10px", ml: "42px" }}>
              <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>
                {e.note ? (<><Box component="span" sx={{ color: "text.secondary" }}>Private note:</Box> {e.note}</>) : <Box component="span" sx={{ color: "text.secondary" }}>No private note</Box>}
              </Box>
              <LinkButton href={budgetHref(period, e.itemId)} size="small" color="inherit" variant="contained" aria-label={`${e.note ? "Edit note" : "Add note or price paid"}: ${e.title}`}>
                {e.note ? "Edit note" : "Add note"}
              </LinkButton>
            </StickerCard>
          </Box>
        );
      })}
    </StickerCard>
  );
}
