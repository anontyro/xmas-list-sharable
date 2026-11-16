"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { createItem, updateItem } from "@/features/wishlists/owner-actions";
import { PRIORITIES, PRIORITY_LABELS, type OwnerItemInput } from "@/features/wishlists/schemas";
import type { OwnerItem } from "@/features/wishlists/views";

const empty = { title: "", productUrl: "", description: "", imageUrl: "", price: "", priority: "would_love" } as const;

function initial(item?: OwnerItem) {
  if (!item) return { ...empty };
  return {
    title: item.title,
    productUrl: item.productUrl ?? "",
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    price: item.priceMinor === null ? "" : (item.priceMinor / 100).toFixed(2),
    priority: item.priority,
  };
}

/** Adds a gift to `listId`, or edits `item` when given. */
export default function ItemForm({ listId, item, onDone }: { listId: string; item?: OwnerItem; onDone?: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState<OwnerItemInput & Record<string, string>>(initial(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(undefined);
    start(async () => {
      const r = item ? await updateItem(item.id, values) : await createItem(listId, values);
      if (!r.ok) {
        setErrors(r.error.fields ?? {});
        if (!r.error.fields) setFormError(r.error.message);
        return;
      }
      if (!item) setValues({ ...empty });
      onDone?.();
      router.refresh();
    });
  };

  const field = (name: keyof typeof empty, label: string, extra: object = {}) => (
    <TextField label={label} value={values[name] ?? ""} onChange={set(name)} error={Boolean(errors[name])} helperText={errors[name]} size="small" {...extra} />
  );

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate>
      {field("title", "Gift", { required: true })}
      {field("productUrl", "Link (optional)", { type: "url" })}
      {field("description", "Notes (optional)", { multiline: true, minRows: 2 })}
      {field("imageUrl", "Image link (optional)", { type: "url" })}
      {field("price", "Price in £ (optional)", { slotProps: { htmlInput: { inputMode: "decimal" } } })}
      {field("priority", "How much do you want it?", { select: true, children: PRIORITIES.map((p) => <MenuItem key={p} value={p}>{PRIORITY_LABELS[p]}</MenuItem>) })}
      {formError && <Alert severity="error">{formError}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={pending}>{item ? "Save changes" : "Add gift"}</Button>
        {item && <Button onClick={onDone}>Cancel</Button>}
      </Stack>
    </Stack>
  );
}
