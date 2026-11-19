"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Note from "@/components/sticker/Note";
import { previewUrlImport } from "@/features/imports/url-actions";
import type { ImportDraft } from "@/features/imports/types";

/**
 * The product link field with "Fetch details" beside it. A fetch only fills in the form (nothing is saved here), and the
 * form is always usable without it: a failed fetch shows its message and leaves everything as it was.
 */
export default function UrlImportPanel({ listId, url, onUrlChange, fieldError, onDraft }: {
  listId: string;
  url: string;
  onUrlChange: (url: string) => void;
  fieldError?: string;
  onDraft: (draft: ImportDraft, duplicateOf: string | null) => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const fetchDetails = () => {
    setError(undefined);
    start(async () => {
      const r = await previewUrlImport(listId, url);
      if (!r.ok) return setError(r.error.message);
      onDraft(r.data.draft, r.data.duplicateOf);
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-start" }}>
        <TextField
          label="Product link"
          type="url"
          size="small"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          error={Boolean(fieldError)}
          helperText={fieldError}
          onKeyDown={(e) => { if (e.key === "Enter" && url.trim() !== "" && !pending) { e.preventDefault(); fetchDetails(); } }}
          sx={{ flex: "1 1 220px" }}
        />
        <Button variant="contained" disabled={pending || url.trim() === ""} onClick={fetchDetails} sx={{ flex: "0 0 auto", mt: "1px" }}>{pending ? "Looking…" : "Fetch details"}</Button>
      </Box>
      {error && <Note tint="pink" role="alert"><p>{error}</p></Note>}
    </Box>
  );
}
