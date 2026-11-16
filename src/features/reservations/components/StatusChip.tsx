import Chip from "@mui/material/Chip";
import Icon from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/icon-names";
import type { GuestItemState, GuestItemStateName } from "../guest-claim-view";

const ICONS: Record<GuestItemStateName, IconName> = {
  available: "christmas/gift_tag",
  interested: "shopping/heart_badge",
  reserved_by_you: "shopping/shopping_bag",
  reserved_by_other: "shopping/shopping_bag",
  purchased_by_you: "interface/completed_badge",
  purchased_by_other: "interface/completed_badge",
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
  return <Chip size="small" color={mine ? "primary" : "default"} variant={state.state === "available" ? "outlined" : "filled"} icon={<Icon name={ICONS[state.state]} size={18} />} label={statusLabel(state)} />;
}
