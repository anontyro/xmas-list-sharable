import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";
import Sticker from "@/components/ui/Sticker";
import { formatGBP } from "@/lib/money";
import ClaimControls from "@/features/reservations/components/ClaimControls";
import StatusChip from "@/features/reservations/components/StatusChip";
import type { ClaimedGuestItem } from "@/features/reservations/guest-claim-view";
import PriorityChip from "./PriorityChip";

/** `canAct`: a named guest viewing a list that is not archived. */
export default function PublicItemCard({ item, canAct }: { item: ClaimedGuestItem; canAct: boolean }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={2}>
          {item.imageUrl ? (
            // A plain <img>: owners paste arbitrary hosts, which next/image would need configured one by one.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.title} width={96} height={96} loading="lazy" referrerPolicy="no-referrer" style={{ objectFit: "cover", borderRadius: 12 }} />
          ) : (
            <Sticker name="presentgold" width={96} />
          )}
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" component="h2" sx={{ overflowWrap: "anywhere" }}>{item.title}</Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <PriorityChip priority={item.priority} />
              <Typography>{item.priceMinor === null ? "No price" : formatGBP(item.priceMinor)}</Typography>
            </Stack>
            {item.description && <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{item.description}</Typography>}
            {item.productUrl && (
              <Link href={item.productUrl} target="_blank" rel="noopener noreferrer nofollow">View product</Link>
            )}
            <StatusChip state={item.state} />
            {canAct && <ClaimControls itemId={item.id} itemTitle={item.title} state={item.state.state} />}
            {canAct && item.state.state !== "available" && !item.state.state.endsWith("_by_other") && <AppLink href="/planner">See it in My Planner</AppLink>}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
