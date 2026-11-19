"use client";

import SectionTitle from "@/components/sticker/SectionTitle";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import GiftThumb from "@/components/sticker/GiftThumb";
import StickerCard from "@/components/sticker/StickerCard";
import StatusChip from "@/features/reservations/components/StatusChip";
import type { GuestItemState } from "@/features/reservations/guest-claim-view";
import { formatGBP } from "@/lib/money";

export type GiftDetails = {
  itemId: string;
  title: string;
  forName: string;
  state: "interested" | "reserved" | "purchased";
  listedPriceMinor: number | null;
  actualPrice: string;
  note: string;
  included: boolean;
};
export type EntryValues = { actualPrice: string; note: string; included: boolean };

const help = { m: 0, fontSize: 13, fontWeight: 700, color: "text.secondary" } as const;

/** The sidebar "Gift details": what the guest paid, a private note, and whether the gift counts in their totals. Values live in the parent form. */
export default function EntryDetailsForm({ gift, values, onChange }: { gift: GiftDetails; values: EntryValues; onChange: (next: EntryValues) => void }) {
  const state: GuestItemState = { state: gift.state === "interested" ? "interested" : `${gift.state}_by_you` };
  return (
    <StickerCard component="section" padded aria-label="Gift details" sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <SectionTitle>Gift details</SectionTitle>
      <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <GiftThumb id={gift.itemId} title={gift.title} imageUrl={null} />
        <Box sx={{ minWidth: 0 }}>
          <Box component="p" sx={{ m: 0, fontWeight: 800, overflowWrap: "anywhere" }}>{gift.title}</Box>
          <Box component="p" sx={{ ...help, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
            For {gift.forName} · <StatusChip state={state} />
          </Box>
        </Box>
      </Box>
      {gift.state !== "interested" && (
        <TextField
          label="What you paid"
          size="small"
          value={values.actualPrice}
          onChange={(e) => onChange({ ...values, actualPrice: e.target.value })}
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          helperText={`${gift.forName}'s list shows ${gift.listedPriceMinor === null ? "no price" : formatGBP(gift.listedPriceMinor)}. What you enter here never changes that list.`}
        />
      )}
      <TextField label="Private note" multiline minRows={3} size="small" value={values.note} onChange={(e) => onChange({ ...values, note: e.target.value })} slotProps={{ htmlInput: { maxLength: 500 } }} />
      <FormControlLabel label="Count this gift in my totals" control={<Checkbox checked={values.included} onChange={(e) => onChange({ ...values, included: e.target.checked })} />} />
      <Box component="p" sx={help}>Only you can see notes and prices. Not the family, not the list owner, not the admin.</Box>
    </StickerCard>
  );
}
