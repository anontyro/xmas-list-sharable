"use client";

import Box from "@mui/material/Box";
import ActionButton from "@/components/ui/ActionButton";
import { moveItemAction } from "@/features/wishlists/reorder-actions";

/** Up and Down inside the gift's priority group; the ends are disabled. The accessible names say which gift. */
export default function ReorderControls({ itemId, title, isFirst, isLast }: { itemId: string; title: string; isFirst: boolean; isLast: boolean }) {
  return (
    <Box sx={{ display: "flex", gap: "8px" }}>
      <ActionButton onAction={() => moveItemAction(itemId, "up")} disabled={isFirst} variant="contained" color="inherit" size="small" aria-label={`Move up: ${title}`}>
        ↑ Up
      </ActionButton>
      <ActionButton onAction={() => moveItemAction(itemId, "down")} disabled={isLast} variant="contained" color="inherit" size="small" aria-label={`Move down: ${title}`}>
        ↓ Down
      </ActionButton>
    </Box>
  );
}
