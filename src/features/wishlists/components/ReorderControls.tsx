import Stack from "@mui/material/Stack";
import ActionButton from "@/components/ui/ActionButton";
import { moveItemAction } from "@/features/wishlists/reorder-actions";

/** Move up and Move down inside the item's priority group; the ends are disabled. */
export default function ReorderControls({ itemId, title, isFirst, isLast }: { itemId: string; title: string; isFirst: boolean; isLast: boolean }) {
  return (
    <Stack direction="row" spacing={1}>
      <ActionButton onAction={() => moveItemAction(itemId, "up")} disabled={isFirst} variant="outlined" size="small" aria-label={`Move up: ${title}`}>
        Move up
      </ActionButton>
      <ActionButton onAction={() => moveItemAction(itemId, "down")} disabled={isLast} variant="outlined" size="small" aria-label={`Move down: ${title}`}>
        Move down
      </ActionButton>
    </Stack>
  );
}
