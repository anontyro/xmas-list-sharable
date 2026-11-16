"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import UrlImportPanel from "@/features/imports/components/UrlImportPanel";
import type { ImportDraft } from "@/features/imports/types";
import { createItem, updateItem } from "@/features/wishlists/owner-actions";
import { PRIORITIES, PRIORITY_LABELS, type OwnerItemInput } from "@/features/wishlists/schemas";
import type { OwnerItem } from "@/features/wishlists/views";
import { minorToPounds } from "@/lib/money";

const empty = { title: "", productUrl: "", description: "", imageUrl: "", price: "", priority: "would_love" } as const;

function initial(item?: OwnerItem) {
  if (!item) return { ...empty };
  return {
    title: item.title,
    productUrl: item.productUrl ?? "",
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    price: minorToPounds(item.priceMinor),
    priority: item.priority,
  };
}

/** Adds a gift to `listId`, or edits `item` when given. */
export default function ItemForm({ listId, item, onDone }: { listId: string; item?: OwnerItem; onDone?: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState<OwnerItemInput & Record<string, string>>(initial(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [notices, setNotices] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value }));

  /** A draft from the link importer fills the fields; the owner still reviews and presses Add gift. */
  const applyDraft = (draft: ImportDraft, duplicateOf: string | null) => {
    setValues((v) => ({
      ...v,
      title: draft.title,
      productUrl: draft.canonicalUrl ?? draft.sourceUrl,
      description: draft.description ?? "",
      imageUrl: draft.imageUrl ?? "",
      price: minorToPounds(draft.priceMinor),
    }));
    setErrors({});
    setNotices([...draft.warnings, ...(duplicateOf ? [`This link is already on your list as "${duplicateOf}". You can still add it again.`] : [])]);
  };

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
      if (!item) {
        setValues({ ...empty });
        setNotices([]);
      }
      onDone?.();
      router.refresh();
    });
  };

  const field = (name: keyof typeof empty, label: string, extra: object = {}) => (
    <TextField label={label} value={values[name] ?? ""} onChange={set(name)} error={Boolean(errors[name])} helperText={errors[name]} size="small" {...extra} />
  );

  return (
    <Stack spacing={3}>
      {!item && <UrlImportPanel listId={listId} onDraft={applyDraft} />}
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {field("title", "Gift", { required: true })}
        {field("productUrl", "Link (optional)", { type: "url" })}
        {field("description", "Notes (optional)", { multiline: true, minRows: 2 })}
        {field("imageUrl", "Image link (optional)", { type: "url" })}
        {field("price", "Price in £ (optional)", { slotProps: { htmlInput: { inputMode: "decimal" } } })}
        {field("priority", "How much do you want it?", { select: true, children: PRIORITIES.map((p) => <MenuItem key={p} value={p}>{PRIORITY_LABELS[p]}</MenuItem>) })}
        {notices.map((n) => (
          <Alert key={n} severity="warning">{n}</Alert>
        ))}
        {formError && <Alert severity="error">{formError}</Alert>}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={pending}>{item ? "Save changes" : "Add gift"}</Button>
          {item && <Button onClick={onDone}>Cancel</Button>}
        </Stack>
      </Stack>
    </Stack>
  );
}
