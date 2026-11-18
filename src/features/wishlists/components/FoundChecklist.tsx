import Box from "@mui/material/Box";
import SectionTitle from "@/components/sticker/SectionTitle";
import Pill from "@/components/sticker/Pill";
import StickerCard from "@/components/sticker/StickerCard";
import type { ImportDraft } from "@/features/imports/types";

/** "What we found": for each part of a fetched page, a ✓ or – pill and the same thing in words. */
export default function FoundChecklist({ draft }: { draft: ImportDraft }) {
  const rows: [string, boolean][] = [
    ["Title", Boolean(draft.title)],
    ["Picture", draft.imageUrl !== null],
    ["Price", draft.priceMinor !== null],
    ["Description", draft.description !== null],
  ];
  return (
    <StickerCard component="section" padded aria-label="What we found" sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <SectionTitle>What we found</SectionTitle>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {rows.map(([name, found]) => (
          <Box component="li" key={name} sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Pill tone={found ? "mint" : "pink"}><span aria-hidden="true">{found ? "✓" : "–"}</span></Pill>
            <Box component="span" sx={{ fontWeight: 800 }}>{found ? `${name} found` : `${name} not found`}</Box>
          </Box>
        ))}
      </Box>
      <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700, color: "text.secondary" }}>Read from the shop page&apos;s own product data. If a shop blocks us, type it in instead.</Box>
    </StickerCard>
  );
}
