import Box from "@mui/material/Box";
import GiftThumb from "@/components/sticker/GiftThumb";
import StickerCard from "@/components/sticker/StickerCard";
import LinkButton from "@/components/ui/LinkButton";
import { formatGBP } from "@/lib/money";
import type { OwnerItem } from "../views";
import ReorderControls from "./ReorderControls";

/** One gift in the owner's editor: picture, title, price, and (unless the list is archived) Up, Down and Edit. Never any claim information. */
export default function OwnerGiftRow({ listId, item, isFirst, isLast, readOnly }: { listId: string; item: OwnerItem; isFirst: boolean; isLast: boolean; readOnly: boolean }) {
  return (
    <StickerCard component="article" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
      <GiftThumb id={item.id} title={item.title} imageUrl={item.imageUrl} />
      <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
        <Box component="h3" sx={{ m: 0, fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" }}>{item.title}</Box>
        <Box component="p" sx={{ m: 0, fontWeight: 800 }}>{item.priceMinor === null ? "No price" : formatGBP(item.priceMinor)}</Box>
      </Box>
      {!readOnly && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <ReorderControls itemId={item.id} title={item.title} isFirst={isFirst} isLast={isLast} />
          <LinkButton href={`/owner/lists/${listId}/gifts/${item.id}`} size="small" variant="contained" color="yellow" aria-label={`Edit ${item.title}`}>Edit</LinkButton>
        </Box>
      )}
    </StickerCard>
  );
}
