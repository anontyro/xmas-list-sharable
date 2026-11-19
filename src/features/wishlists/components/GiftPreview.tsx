import Box from "@mui/material/Box";
import SectionTitle from "@/components/sticker/SectionTitle";
import GiftThumb from "@/components/sticker/GiftThumb";
import Pill from "@/components/sticker/Pill";
import StickerCard from "@/components/sticker/StickerCard";
import { formatGBP, parsePoundsToMinor } from "@/lib/money";
import { PRIORITY_LABELS, type Priority } from "../schemas";

/** "How guests see it": the gift as a row, updating as the owner types. It has no buttons or status (and no reservation code: owner pages never import it). */
export default function GiftPreview({ id, title, price, imageUrl, priority }: { id: string; title: string; price: string; imageUrl: string; priority: Priority }) {
  const minor = price.trim() === "" ? null : parsePoundsToMinor(price);
  return (
    <StickerCard component="section" padded aria-label="How guests see it" sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionTitle>How guests see it</SectionTitle>
      <StickerCard component="article" sx={{ display: "flex", gap: "12px" }}>
        <GiftThumb id={id} title={title} imageUrl={imageUrl.trim() === "" ? null : imageUrl.trim()} />
        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
          <Box component="h3" sx={{ m: 0, fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" }}>{title.trim() || "Your gift"}</Box>
          <Box component="p" sx={{ m: 0, fontWeight: 800 }}>{minor === null ? "No price" : formatGBP(minor)}</Box>
          <Box><Pill>{PRIORITY_LABELS[priority]}</Pill></Box>
        </Box>
      </StickerCard>
    </StickerCard>
  );
}
