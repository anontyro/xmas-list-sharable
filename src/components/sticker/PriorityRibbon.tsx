import Box from "@mui/material/Box";
import type { Priority } from "@/features/wishlists/schemas";
import { PRIORITY_LABELS } from "@/features/wishlists/schemas";
import Ribbon, { type RibbonTone } from "./Ribbon";

const LOOK: Record<Priority, { tone: RibbonTone; star: boolean }> = {
  most_wanted: { tone: "red", star: true },
  would_love: { tone: "green", star: false },
  nice_to_have: { tone: "sky", star: false },
};

/** The ribbon above each priority group ("★ MOST WANTED"), as the level 2 heading of the group. The star is decoration; the label is plain text. */
export default function PriorityRibbon({ priority }: { priority: Priority }) {
  const { tone, star } = LOOK[priority];
  return (
    <Box component="h2" sx={{ m: 0 }}>
      <Ribbon tone={tone}>
        {star && <span aria-hidden="true">★ </span>}
        {PRIORITY_LABELS[priority].toUpperCase()}
      </Ribbon>
    </Box>
  );
}
