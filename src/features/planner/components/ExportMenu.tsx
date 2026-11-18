"use client";

import SectionTitle from "@/components/sticker/SectionTitle";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Note from "@/components/sticker/Note";
import StickerCard from "@/components/sticker/StickerCard";
import { buildExport } from "../export/build";
import { formatCsv } from "../export/csv";
import { formatMarkdown } from "../export/markdown";
import { formatText } from "../export/text";
import type { ExportInput } from "../export/types";
import type { PlannerView } from "../queries";
import { useSelection } from "./SelectionContext";

function download(filename: string, mime: string, content: string, bom = "") {
  const url = URL.createObjectURL(new Blob([bom + content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** The "Shopping list" card: copy, Markdown and CSV for the ticked entries. The files are built here from the planner data already on the page. */
export default function ExportMenu({ plan }: { plan: PlannerView }) {
  const { selected, setAll, clear } = useSelection();
  const [includeNotes, setIncludeNotes] = useState(false);
  const [message, setMessage] = useState<{ tint: "mint" | "yellow" | "pink"; text: string }>();
  const allIds = plan.groups.flatMap((g) => g.entries.map((e) => e.itemId));
  // Ticked gifts that have since left the planner (released, say) must not count.
  const chosen = allIds.filter((id) => selected.has(id)).length;
  if (allIds.length === 0) return null;

  const base = `gift-planner-${plan.selected.occasion}-${plan.selected.year}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const run = (fn: (input: ExportInput) => void | Promise<void>) => {
    if (chosen === 0) return setMessage({ tint: "yellow", text: "Choose at least one gift" });
    setMessage(undefined);
    return fn(buildExport(plan, selected, includeNotes));
  };

  const copy = () =>
    run(async (input) => {
      try {
        await navigator.clipboard.writeText(formatText(input));
        setMessage({ tint: "mint", text: "Copied" });
      } catch {
        setMessage({ tint: "pink", text: "Couldn't copy. Try a download instead." });
      }
    });

  return (
    <StickerCard component="section" padded aria-label="Shopping list" sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <SectionTitle>Shopping list</SectionTitle>
        <Box component="p" aria-live="polite" sx={{ m: 0, fontWeight: 800, fontSize: 14, color: "text.secondary" }}>{chosen} of {allIds.length} selected</Box>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <Button size="small" variant="ghost" onClick={() => setAll(allIds)}>Select all</Button>
        <Button size="small" variant="ghost" onClick={clear}>Clear</Button>
      </Box>
      <FormControlLabel label="Include my private notes" control={<Checkbox checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />} />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <Button variant="contained" sx={{ flex: "1 1 120px" }} onClick={copy}>Copy list</Button>
        <Button variant="contained" color="sky" sx={{ flex: "1 1 120px" }} aria-label="Download Markdown" onClick={() => run((i) => download(`${base}.md`, "text/markdown", formatMarkdown(i)))}>Markdown</Button>
        <Button variant="contained" color="sky" sx={{ flex: "1 1 120px" }} aria-label="Download CSV" onClick={() => run((i) => download(`${base}.csv`, "text/csv", formatCsv(i), "﻿"))}>CSV</Button>
      </Box>
      {message && <Note tint={message.tint} role="status"><p>{message.text}</p></Note>}
      <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700, color: "text.secondary" }}>Exports never include your recovery link or other people&apos;s plans.</Box>
    </StickerCard>
  );
}
