"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import GiftThumb from "@/components/sticker/GiftThumb";
import Note from "@/components/sticker/Note";
import Pill from "@/components/sticker/Pill";
import Ribbon from "@/components/sticker/Ribbon";
import StickerCard from "@/components/sticker/StickerCard";
import TwoColumn from "@/components/sticker/TwoColumn";
import LinkButton from "@/components/ui/LinkButton";
import { commitBulkImport, previewAmazonImport } from "@/features/imports/bulk-actions";
import { MAX_INPUT_BYTES } from "@/features/imports/amazon/shared";
import type { AmazonDraft } from "@/features/imports/types";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/features/wishlists/schemas";
import { formatGBP, minorToPounds } from "@/lib/money";
import { tokens } from "@/theme/tokens";

type Row = { key: number; draft: AmazonDraft; title: string; price: string; duplicateOf: string | null; selected: boolean; priority: Priority };

const heading = { m: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 20 } as const;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Paste an Amazon wishlist, tick the gifts to add, set each one's priority, fill in missing prices. Nothing is saved until "Add". */
export default function ImportWizard({ listId, backHref, addHref }: { listId: string; backHref: string; addHref: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [found, setFound] = useState(0);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const reset = () => {
    setText("");
    setRows([]);
    setFound(0);
    setError(undefined);
  };
  const change = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const find = () => {
    setError(undefined);
    // Checked here too: the server never sees a paste that is over the request size limit.
    if (new TextEncoder().encode(text).length > MAX_INPUT_BYTES) {
      setRows([]);
      return setError("That's too much to read at once. Paste a smaller part of the list, or add gifts by hand.");
    }
    start(async () => {
      const r = await previewAmazonImport(listId, text);
      if (!r.ok) {
        setRows([]);
        return setError(r.error.message);
      }
      setFound(r.data.length);
      setRows(r.data.map(({ draft, duplicateOf }, key) => ({ key, draft, title: draft.title, price: minorToPounds(draft.priceMinor), duplicateOf, selected: duplicateOf === null, priority: "would_love" })));
    });
  };

  const chosen = rows.filter((r) => r.selected && r.title.trim() !== "");
  const skippedDuplicates = rows.filter((r) => !r.selected && r.duplicateOf !== null).length;
  const skippedOther = rows.filter((r) => !r.selected && r.duplicateOf === null).length;
  const missingPrice = chosen.filter((r) => r.price.trim() === "").length;

  const add = () => {
    setError(undefined);
    start(async () => {
      const r = await commitBulkImport(
        listId,
        chosen.map((c) => ({ title: c.title, productUrl: c.draft.canonicalUrl ?? c.draft.sourceUrl, imageUrl: c.draft.imageUrl ?? "", price: c.price, priority: c.priority })),
      );
      if (!r.ok) return setError(r.error.message);
      router.push(backHref);
      router.refresh();
    });
  };

  const step = (n: number, label: string) => (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <Box component="span" aria-hidden="true" sx={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${tokens.ink}`, borderRadius: "50%", fontFamily: "var(--font-display), sans-serif", fontSize: 15, backgroundColor: tokens.yellow }}>{n}</Box>
      <Box component="p" sx={{ m: 0, flex: 1, fontWeight: 700 }}>{label}</Box>
    </Box>
  );

  const main = (
    <>
      <StickerCard component="section" padded sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <TextField label="Paste your wishlist" multiline minRows={6} maxRows={12} value={text} onChange={(e) => setText(e.target.value)} size="small" fullWidth />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <Button variant="contained" disabled={pending || text.trim() === ""} onClick={find} sx={{ flex: "1 1 140px" }}>Find gifts</Button>
          <Button variant="ghost" disabled={pending || text === ""} onClick={() => setText("")} sx={{ flex: "0 1 110px" }}>Clear</Button>
        </Box>
      </StickerCard>
      {error && (
        <Note tint="pink" role="alert">
          <p>{error}</p>
          <Box sx={{ mt: "8px" }}><LinkButton href={addHref} size="small" variant="contained" color="inherit">Add a gift by hand</LinkButton></Box>
        </Note>
      )}
      <Note tint="yellow" sticker="sparkles"><p>Best effort: Amazon changes its pages, so check each gift. If nothing is found, you can still add gifts one at a time.</p></Note>
      {rows.length > 0 && (
        <>
          <Box component="h2" sx={{ m: 0 }}><Ribbon tone="sky">WE FOUND {found} {found === 1 ? "GIFT" : "GIFTS"}</Ribbon></Box>
          <Box component="ul" aria-label="Gifts found" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: "14px", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
            {rows.map((row) => {
              const label = row.title.trim() || "this gift";
              const pill = row.duplicateOf !== null ? ["Already on your list", "pink"] as const : row.draft.priceMinor === null ? ["Price not found", "pink"] as const : ["All found", "mint"] as const;
              return (
                <Box component="li" key={row.key}>
                  <StickerCard component="article" sx={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <Checkbox checked={row.selected} onChange={(e) => change(row.key, { selected: e.target.checked })} slotProps={{ input: { "aria-label": `Add ${label}` } }} />
                      <GiftThumb id={`import-${row.key}`} title={row.title} imageUrl={row.draft.imageUrl} />
                      <Box sx={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                        <TextField label="Gift" size="small" fullWidth value={row.title} error={row.selected && row.title.trim() === ""} onChange={(e) => change(row.key, { title: e.target.value })} />
                        {row.draft.priceMinor !== null && <Box component="p" sx={{ m: 0, fontWeight: 800 }}>{formatGBP(row.draft.priceMinor)}</Box>}
                        <Box><Pill tone={pill[1]}>{pill[0]}</Pill></Box>
                        {row.draft.warnings.map((w) => (
                          <Box component="p" key={w} sx={{ m: 0, fontSize: 12, fontWeight: 700, color: "text.secondary" }}>{w}</Box>
                        ))}
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      {!row.selected ? (
                        <Box component="p" sx={{ m: 0, fontWeight: 800, fontSize: 13, color: "text.secondary" }}>Skipped</Box>
                      ) : (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {row.draft.priceMinor === null && (
                            <TextField size="small" placeholder="Add a price (£)" value={row.price} onChange={(e) => change(row.key, { price: e.target.value })} slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `Price for ${label}` } }} sx={{ width: 150 }} />
                          )}
                          <TextField select size="small" value={row.priority} onChange={(e) => change(row.key, { priority: e.target.value as Priority })} slotProps={{ select: { native: true }, htmlInput: { "aria-label": `Priority for ${label}` } }}>
                            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                          </TextField>
                        </Box>
                      )}
                      <Button variant="ghost" size="small" onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))} aria-label={`Remove ${label}`}>Remove</Button>
                    </Box>
                  </StickerCard>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </>
  );

  const side = (
    <StickerCard component="section" tint="yellow" padded aria-label="Ready to add" sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Box component="h2" sx={heading}>Ready to add</Box>
      <Box component="p" aria-live="polite" sx={{ m: 0, fontWeight: 800 }}>{plural(chosen.length, "gift", "gifts")} will be added to your list</Box>
      {(skippedDuplicates > 0 || skippedOther > 0 || missingPrice > 0) && (
        <Box component="p" sx={{ m: 0, fontWeight: 700, fontSize: 14 }}>
          {skippedDuplicates > 0 && `${skippedDuplicates} already on your list, so ${skippedDuplicates === 1 ? "it's" : "they're"} skipped. `}
          {skippedOther > 0 && `${skippedOther} not ticked. `}
          {missingPrice > 0 && `${missingPrice} ${missingPrice === 1 ? "needs" : "need"} a price.`}
        </Box>
      )}
      <Button size="large" variant="contained" disabled={pending || chosen.length === 0} onClick={add}>Add {plural(chosen.length, "gift", "gifts")}</Button>
      <Button variant="ghost" disabled={pending} onClick={reset}>Start over</Button>
    </StickerCard>
  );

  return (
    <>
      <StickerCard component="section" padded aria-label="How it works">
        <Box sx={{ display: "grid", gap: "14px", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" } }}>
          {step(1, "Open your Amazon wishlist and select everything on the page.")}
          {step(2, "Copy it.")}
          {step(3, "Paste it below, then check what we found.")}
        </Box>
      </StickerCard>
      {rows.length > 0 ? <TwoColumn sideLast main={main} side={side} /> : <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>{main}</Box>}
    </>
  );
}
