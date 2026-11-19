import Box from "@mui/material/Box";
import Sticker from "@/components/ui/Sticker";
import type { StickerName } from "@/components/ui/sticker-names";
import StickerCard from "./StickerCard";

/** The dashed card for a list with nothing in it: a sticker, a sentence saying why, and (optionally) what to do next. */
export default function Empty({ sticker = "sparkles", action, children }: { sticker?: StickerName; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <StickerCard tint="cream" padded sx={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
      <Sticker name={sticker} width={56} />
      <Box sx={{ flex: 1, minWidth: 180, fontWeight: 700 }}>{children}</Box>
      {action}
    </StickerCard>
  );
}
