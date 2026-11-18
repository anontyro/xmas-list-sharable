import Pill from "@/components/sticker/Pill";
import type { Tint } from "@/components/sticker/tint";
import type { GuestItemState, GuestItemStateName } from "../guest-claim-view";

const TONE: Record<GuestItemStateName, Tint | undefined> = {
  available: undefined,
  interested: "pink",
  reserved_by_you: "yellow",
  reserved_by_other: "yellow",
  purchased_by_you: "mint",
  purchased_by_other: "mint",
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

/** Status in words; the tint only reinforces it (decision 0020). */
export default function StatusChip({ state }: { state: GuestItemState }) {
  return <Pill tone={TONE[state.state]}>{statusLabel(state)}</Pill>;
}
