"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { commitBulkImport, previewAmazonImport } from "@/features/imports/bulk-actions";
import { MAX_INPUT_BYTES } from "@/features/imports/amazon/shared";
import type { AmazonDraft } from "@/features/imports/types";
import { minorToPounds } from "@/lib/money";

type Row = { key: number; draft: AmazonDraft; title: string; duplicateOf: string | null };

/** Paste an Amazon wishlist, check the drafts, add the ones you want. Nothing is saved until "Add selected items". */
export default function BulkImportDialog({ listId }: { listId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const close = () => {
    setOpen(false);
    setText("");
    setRows([]);
    setError(undefined);
  };

  const parse = () => {
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
      setRows(r.data.map(({ draft, duplicateOf }, key) => ({ key, draft, title: draft.title, duplicateOf })));
    });
  };

  const add = () => {
    setError(undefined);
    start(async () => {
      const r = await commitBulkImport(
        listId,
        rows.map(({ draft, title }) => ({
          title,
          productUrl: draft.canonicalUrl ?? draft.sourceUrl,
          imageUrl: draft.imageUrl ?? "",
          price: minorToPounds(draft.priceMinor),
        })),
      );
      if (!r.ok) return setError(r.error.message);
      close();
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>Import from an Amazon wishlist</Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="bulk-title">
        <DialogTitle id="bulk-title">Import from an Amazon wishlist</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Paste the page source or the copied text of your wishlist. Nothing is added until you check the list below and press Add selected items.
            </Typography>
            <TextField label="Pasted wishlist" multiline minRows={4} maxRows={8} value={text} onChange={(e) => setText(e.target.value)} size="small" />
            <Button variant="contained" onClick={parse} disabled={pending || text.trim() === ""} sx={{ alignSelf: "flex-start" }}>Parse</Button>
            {error && <Alert severity="warning">{error}</Alert>}
            {rows.length > 0 && (
              <Stack component="ul" spacing={2} sx={{ listStyle: "none", p: 0, m: 0 }} aria-label="Gifts found">
                {rows.map((row) => (
                  <Stack component="li" key={row.key} spacing={0.5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                      <TextField
                        label="Gift" size="small" fullWidth value={row.title} error={row.title.trim() === ""}
                        onChange={(e) => setRows((rs) => rs.map((x) => (x.key === row.key ? { ...x, title: e.target.value } : x)))}
                        helperText={row.draft.priceMinor === null ? undefined : `£${minorToPounds(row.draft.priceMinor)}`}
                      />
                      <Button size="small" color="inherit" onClick={() => setRows((rs) => rs.filter((x) => x.key !== row.key))} aria-label={`Remove ${row.title || "this gift"}`}>Remove</Button>
                    </Stack>
                    {row.draft.warnings.map((w) => <Typography key={w} variant="caption" color="warning.main">{w}</Typography>)}
                    {row.duplicateOf && <Typography variant="caption" color="warning.main">Already on your list as &quot;{row.duplicateOf}&quot;. You can still add it again.</Typography>}
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button variant="contained" onClick={add} disabled={pending || rows.every((r) => r.title.trim() === "")}>Add selected items</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
