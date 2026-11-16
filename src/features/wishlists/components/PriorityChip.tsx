import Chip from "@mui/material/Chip";
import Icon from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/icon-names";
import { PRIORITY_LABELS, type Priority } from "../schemas";

const ICONS: Record<Priority, IconName> = {
  most_wanted: "christmas/gold_star",
  would_love: "shopping/heart_wishlist",
  nice_to_have: "shopping/sparkles",
};

/** Priority in words plus an icon, so it never relies on colour alone. */
export default function PriorityChip({ priority }: { priority: Priority }) {
  return <Chip size="small" variant="outlined" icon={<Icon name={ICONS[priority]} size={18} />} label={PRIORITY_LABELS[priority]} />;
}
