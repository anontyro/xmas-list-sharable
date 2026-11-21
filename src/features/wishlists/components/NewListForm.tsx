"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import StickerCard from "@/components/sticker/StickerCard";
import { createOwnList } from "../list-actions";

/** Makes the member's own list, as a private draft or straight away for the family (decision 0029). Opens its editor. */
export default function NewListForm({ year }: { year: number }) {
  const router = useRouter();
  const [occasion, setOccasion] = useState("Christmas");
  const [listYear, setListYear] = useState(String(year));
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (draft: boolean) => {
    setError(undefined);
    const yearNumber = Number(listYear.trim());
    if (!title.trim()) return setError("Enter a title");
    if (!occasion.trim()) return setError("Enter an occasion");
    if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2100) return setError("Enter a year like 2026");
    start(async () => {
      const r = await createOwnList({ title, occasion, year: yearNumber, draft });
      if (!r.ok) return setError(r.error.message);
      router.push(`/owner/lists/${r.data.id}`);
      router.refresh();
    });
  };

  return (
    <StickerCard component="section" aria-label="New list" padded>
      <Box component="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); submit(false); }} sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required slotProps={{ htmlInput: { maxLength: 80 } }} />
        <TextField label="Occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} required slotProps={{ htmlInput: { maxLength: 40 } }} />
        <TextField label="Year" value={listYear} onChange={(e) => setListYear(e.target.value)} required slotProps={{ htmlInput: { inputMode: "numeric" } }} />
        <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700 }}>A draft is only visible to you until you publish it. A published list is shared with the family.</Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={pending}>Create and publish</Button>
        <Button type="button" variant="outlined" size="large" disabled={pending} onClick={() => submit(true)}>Save as a draft</Button>
      </Box>
    </StickerCard>
  );
}
