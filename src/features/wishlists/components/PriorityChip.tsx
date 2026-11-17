import Chip from "@mui/material/Chip";
import Sticker from "@/components/ui/Sticker";
import type { StickerName } from "@/components/ui/sticker-names";
import { PRIORITY_LABELS, type Priority } from "../schemas";

const STICKER: Record<Priority, StickerName> = {
  most_wanted: "star",
  would_love: "heartlist",
  nice_to_have: "sparkles",
};

/** Priority in words plus an icon, so it never relies on colour alone. */
export default function PriorityChip({ priority }: { priority: Priority }) {
  return <Chip size="small" variant="outlined" icon={<Sticker name={STICKER[priority]} width={20} />} label={PRIORITY_LABELS[priority]} />;
}
