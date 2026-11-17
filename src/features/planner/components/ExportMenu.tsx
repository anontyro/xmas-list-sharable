"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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

/** Copy, Markdown and CSV for the ticked entries. The files are built here from the planner data already on the page. */
export default function ExportMenu({ plan }: { plan: PlannerView }) {
  const { selected, setAll, clear } = useSelection();
  const [includeNotes, setIncludeNotes] = useState(false);
  const [message, setMessage] = useState<{ severity: "success" | "warning" | "error"; text: string }>();
  const allIds = plan.groups.flatMap((g) => g.entries.map((e) => e.itemId));
  // Ticked gifts that have since left the planner (released, say) must not count.
  const chosen = allIds.filter((id) => selected.has(id)).length;
  if (allIds.length === 0) return null;

  const base = `gift-planner-${plan.selected.occasion}-${plan.selected.year}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const run = (fn: (input: ExportInput) => void | Promise<void>) => {
    if (chosen === 0) return setMessage({ severity: "warning", text: "Choose at least one gift" });
    setMessage(undefined);
    return fn(buildExport(plan, selected, includeNotes));
  };

  const copy = () =>
    run(async (input) => {
      try {
        await navigator.clipboard.writeText(formatText(input));
        setMessage({ severity: "success", text: "Copied" });
      } catch {
        setMessage({ severity: "error", text: "Couldn't copy. Try a download instead." });
      }
    });

  return (
    <Paper component="section" aria-label="Export" sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>Share my list</Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>Tick the gifts below, then copy or download them.</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mb: 1 }}>
        <Button size="small" onClick={() => setAll(allIds)}>Select all</Button>
        <Button size="small" onClick={clear}>Clear</Button>
        <Typography sx={{ alignSelf: "center" }} aria-live="polite">{chosen} selected</Typography>
      </Stack>
      <FormControlLabel label="Include my private notes" control={<Checkbox checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />} />
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
        <Button variant="contained" onClick={copy}>Copy list</Button>
        <Button variant="outlined" onClick={() => run((i) => download(`${base}.md`, "text/markdown", formatMarkdown(i)))}>Download Markdown</Button>
        <Button variant="outlined" onClick={() => run((i) => download(`${base}.csv`, "text/csv", formatCsv(i), "﻿"))}>Download CSV</Button>
      </Stack>
      {message && <Alert severity={message.severity} role="status" sx={{ mt: 2 }}>{message.text}</Alert>}
    </Paper>
  );
}
