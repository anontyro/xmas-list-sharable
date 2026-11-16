"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { previewUrlImport } from "@/features/imports/url-actions";
import type { ImportDraft } from "@/features/imports/types";

/** Paste a product link to pre-fill the item form. Nothing is saved here, and the form is always usable without it. */
export default function UrlImportPanel({ listId, onDraft }: { listId: string; onDraft: (draft: ImportDraft, duplicateOf: string | null) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const fetchDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await previewUrlImport(listId, url);
      if (!r.ok) return setError(r.error.message);
      onDraft(r.data.draft, r.data.duplicateOf);
      setUrl("");
    });
  };

  return (
    <Stack component="form" spacing={1} onSubmit={fetchDetails} aria-label="Fill in from a link">
      <Typography variant="subtitle2" component="h3">Have a link? Fill it in for me</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField label="Product link" type="url" size="small" value={url} onChange={(e) => setUrl(e.target.value)} sx={{ flexGrow: 1 }} />
        <Button type="submit" variant="outlined" disabled={pending || url.trim() === ""}>{pending ? "Looking…" : "Fetch details"}</Button>
      </Stack>
      {error && <Alert severity="warning">{error}</Alert>}
    </Stack>
  );
}
