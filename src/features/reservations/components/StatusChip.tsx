import Chip from "@mui/material/Chip";
import Sticker from "@/components/ui/Sticker";
import type { StickerName } from "@/components/ui/sticker-names";
import type { GuestItemState, GuestItemStateName } from "../guest-claim-view";

const STICKER: Record<GuestItemStateName, StickerName> = {
  available: "gifttag",
  interested: "heartbadge",
  reserved_by_you: "bag",
  reserved_by_other: "bag",
  purchased_by_you: "badge",
  purchased_by_other: "badge",
};

export function statusLabel({ state, claimedBy }: GuestItemState): string {
  switch (state) {
    case "available": return "Available";
    case "interested": return "Interested";
    case "reserved_by_you": return "Reserved by you";
    case "purchased_by_you": return "Purchased by you";
    case "reserved_by_other": return claimedBy ? `Reserved by ${claimedBy}` : "Reserved";
    case "purchased_by_other": return claimedBy ? `Purchased by ${claimedBy}` : "Purchased";
  }
}

/** Status in words with an icon; colour only reinforces it. */
export default function StatusChip({ state }: { state: GuestItemState }) {
  const mine = state.state.endsWith("_by_you") || state.state === "interested";
  return <Chip size="small" color={mine ? "primary" : "default"} variant={state.state === "available" ? "outlined" : "filled"} icon={<Sticker name={STICKER[state.state]} width={20} />} label={statusLabel(state)} />;
}
