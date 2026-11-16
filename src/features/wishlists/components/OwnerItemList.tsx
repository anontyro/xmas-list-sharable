"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ActionButton from "@/components/ui/ActionButton";
import Icon from "@/components/ui/Icon";
import { deleteItem } from "@/features/wishlists/owner-actions";
import { PRIORITIES, PRIORITY_LABELS } from "@/features/wishlists/schemas";
import type { OwnerItem } from "@/features/wishlists/views";
import { formatGBP } from "@/lib/money";
import ItemForm from "./ItemForm";
import PriorityChip from "./PriorityChip";

export default function OwnerItemList({ listId, items, readOnly }: { listId: string; items: OwnerItem[]; readOnly: boolean }) {
  const [editing, setEditing] = useState<string>();

  if (items.length === 0) return <Typography>No gifts yet. Add your first one above.</Typography>;

  return (
    <Stack spacing={3}>
      {PRIORITIES.map((priority) => {
        const group = items.filter((i) => i.priority === priority);
        if (group.length === 0) return null;
        return (
          <Box key={priority} component="section" aria-label={PRIORITY_LABELS[priority]}>
            <Typography variant="h6" component="h3" gutterBottom>{PRIORITY_LABELS[priority]}</Typography>
            <Stack spacing={1}>
              {group.map((item) => (
                <Paper key={item.id} sx={{ p: 2 }}>
                  {editing === item.id ? (
                    <ItemForm listId={listId} item={item} onDone={() => setEditing(undefined)} />
                  ) : (
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        <Icon name="christmas/wrapped_present_red" size={28} />
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{item.title}</Typography>
                        <PriorityChip priority={item.priority} />
                      </Stack>
                      {item.priceMinor !== null && <Typography>{formatGBP(item.priceMinor)}</Typography>}
                      {item.description && <Typography color="text.secondary">{item.description}</Typography>}
                      {item.productUrl && (
                        <Link href={item.productUrl} target="_blank" rel="noopener noreferrer nofollow">View product</Link>
                      )}
                      {!readOnly && (
                        <Stack direction="row" spacing={1}>
                          <Button variant="outlined" size="small" onClick={() => setEditing(item.id)}>Edit</Button>
                          <ActionButton onAction={() => deleteItem(item.id)} variant="outlined" color="error" size="small" confirmText="Remove this gift from your list?">
                            Remove
                          </ActionButton>
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
