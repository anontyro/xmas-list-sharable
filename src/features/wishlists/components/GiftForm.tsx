"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Note from "@/components/sticker/Note";
import Pill from "@/components/sticker/Pill";
import StickerCard from "@/components/sticker/StickerCard";
import TwoColumn from "@/components/sticker/TwoColumn";
import LinkButton from "@/components/ui/LinkButton";
import UrlImportPanel from "@/features/imports/components/UrlImportPanel";
import type { ImportDraft } from "@/features/imports/types";
import { createItem, deleteItem, updateItem } from "@/features/wishlists/owner-actions";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/features/wishlists/schemas";
import type { OwnerItem } from "@/features/wishlists/views";
import { minorToPounds } from "@/lib/money";
import FoundChecklist from "./FoundChecklist";
import GiftPreview from "./GiftPreview";
import { Choice } from "./ListFilters";

type Values = { title: string; productUrl: string; description: string; imageUrl: string; price: string; priority: Priority };

const initial = (item?: OwnerItem): Values => ({
  title: item?.title ?? "",
  productUrl: item?.productUrl ?? "",
  description: item?.description ?? "",
  imageUrl: item?.imageUrl ?? "",
  price: minorToPounds(item?.priceMinor ?? null),
  priority: item?.priority ?? "would_love",
});

/** Adds a gift to `listId`, or edits `item`. Every field is always usable: "Paste a link" only adds the Fetch button, so a failed lookup never blocks typing it in. */
export default function GiftForm({ listId, item, initialMode, backHref }: { listId: string; item?: OwnerItem; initialMode: "link" | "manual"; backHref: string }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [values, setValues] = useState<Values>(initial(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const set = (name: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value }));

  /** A fetched draft fills the fields; the owner still checks them and presses Save gift. */
  const applyDraft = (d: ImportDraft, duplicateOf: string | null) => {
    setValues((v) => ({ ...v, title: d.title, productUrl: d.canonicalUrl ?? d.sourceUrl, description: d.description ?? "", imageUrl: d.imageUrl ?? "", price: minorToPounds(d.priceMinor) }));
    setErrors({});
    setDraft(d);
    setNotices([...d.warnings, ...(duplicateOf ? [`This link is already on your list as "${duplicateOf}". You can still add it again.`] : [])]);
  };

  const save = (e: React.FormEvent) => {
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
      router.push(backHref);
      router.refresh();
    });
  };

  const remove = () => {
    if (!item || !window.confirm("Remove this gift from your list?")) return;
    setFormError(undefined);
    start(async () => {
      const r = await deleteItem(item.id);
      if (!r.ok) return setFormError(r.error.message);
      router.push(backHref);
      router.refresh();
    });
  };

  const field = (name: keyof Values, label: string, extra: object = {}) => (
    <TextField label={label} value={values[name]} onChange={set(name)} error={Boolean(errors[name])} helperText={errors[name]} size="small" {...extra} />
  );

  const card = (
    <StickerCard component="section" padded aria-label={item ? "Edit gift" : "Add gift"} sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Box role="group" aria-label="How to add it" sx={{ display: "flex", gap: "8px" }}>
        <Choice on={mode === "link"} onClick={() => setMode("link")}>Paste a link</Choice>
        <Choice on={mode === "manual"} onClick={() => setMode("manual")}>Type it in</Choice>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: "14px", "& > .span2": { gridColumn: { sm: "1 / -1" } } }}>
        <div className="span2">
          {mode === "link" ? (
            <UrlImportPanel listId={listId} url={values.productUrl} onUrlChange={(productUrl) => setValues((v) => ({ ...v, productUrl }))} fieldError={errors.productUrl} onDraft={applyDraft} />
          ) : (
            field("productUrl", "Product link (optional)", { type: "url", fullWidth: true })
          )}
        </div>
        {draft && (
          <div className="span2">
            <Note tint="mint" sticker="badge" role="status"><p>Found the title, picture and price. Check them, then save.</p></Note>
          </div>
        )}
        {notices.map((n) => (
          <div className="span2" key={n}><Note tint="yellow" role="status"><p>{n}</p></Note></div>
        ))}
        {field("title", "What is it?", { required: true })}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          {field("price", "Price", { slotProps: { htmlInput: { inputMode: "decimal" } }, sx: { flex: 1 } })}
          <Box sx={{ mt: "7px" }}><Pill>GBP</Pill></Box>
        </Box>
        <div role="group" aria-labelledby="gift-priority">
          <Box component="p" id="gift-priority" sx={{ m: 0, mb: "6px", fontWeight: 800, fontSize: 13 }}>How much do you want it?</Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PRIORITIES.map((p) => (
              <Choice key={p} on={values.priority === p} onClick={() => setValues((v) => ({ ...v, priority: p }))}>{PRIORITY_LABELS[p]}</Choice>
            ))}
          </Box>
        </div>
        {field("imageUrl", "Picture link", { type: "url" })}
        <div className="span2">{field("description", "Notes for the family (optional)", { multiline: true, minRows: 3, fullWidth: true, placeholder: "Size, colour or anything that helps" })}</div>
      </Box>
      {formError && <Note tint="pink" role="alert"><p>{formError}</p></Note>}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <Button type="submit" size="large" variant="contained" disabled={pending} sx={{ flex: "1 1 200px" }}>Save gift</Button>
        <LinkButton href={backHref} size="large" variant="ghost" sx={{ flex: "0 1 140px" }}>Cancel</LinkButton>
      </Box>
      {item && <Button variant="ghost" color="inherit" size="small" disabled={pending} onClick={remove} sx={{ alignSelf: "flex-start" }}>Remove this gift</Button>}
    </StickerCard>
  );

  return (
    <Box component="form" onSubmit={save} noValidate>
      <TwoColumn
        sideLast
        main={card}
        side={
          <>
            <GiftPreview id={item?.id ?? "new-gift"} title={values.title} price={values.price} imageUrl={values.imageUrl} priority={values.priority} />
            {draft && <FoundChecklist draft={draft} />}
          </>
        }
      />
    </Box>
  );
}
