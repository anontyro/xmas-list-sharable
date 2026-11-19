import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import AppLink from "@/components/ui/AppLink";
import GiftThumb from "@/components/sticker/GiftThumb";
import StickerCard from "@/components/sticker/StickerCard";
import ClaimControls from "@/features/reservations/components/ClaimControls";
import StatusChip from "@/features/reservations/components/StatusChip";
import type { ClaimedGuestItem } from "@/features/reservations/guest-claim-view";
import { formatGBP } from "@/lib/money";

/** One gift on a list. `canAct`: a named guest viewing a list that is not archived. */
export default function GiftRow({ item, canAct }: { item: ClaimedGuestItem; canAct: boolean }) {
  const mine = item.state.state !== "available" && !item.state.state.endsWith("_by_other");
  return (
    <StickerCard component="article" sx={{ display: "flex", gap: "12px" }}>
      <GiftThumb id={item.id} title={item.title} imageUrl={item.imageUrl} />
      <Box sx={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <Box component="h3" sx={{ m: 0, fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" }}>{item.title}</Box>
        <Box component="p" sx={{ m: 0, fontWeight: 800 }}>{item.priceMinor === null ? "No price" : formatGBP(item.priceMinor)}</Box>
        {item.description && <Box component="p" sx={{ m: 0, color: "text.secondary", overflowWrap: "anywhere" }}>{item.description}</Box>}
        {item.productUrl && <Link href={item.productUrl} target="_blank" rel="noopener noreferrer nofollow">View product</Link>}
        <Box><StatusChip state={item.state} /></Box>
        {canAct && <ClaimControls itemId={item.id} itemTitle={item.title} state={item.state.state} />}
        {canAct && mine && <AppLink href="/planner">See it in My Planner</AppLink>}
      </Box>
    </StickerCard>
  );
}
