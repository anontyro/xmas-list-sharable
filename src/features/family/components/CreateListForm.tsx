"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import SectionTitle from "@/components/sticker/SectionTitle";
import StickerCard from "@/components/sticker/StickerCard";
import { createList } from "@/features/family/actions";

export default function CreateListForm({ members, year }: { members: { id: string; displayName: string }[]; year: number }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [occasion, setOccasion] = useState("Christmas");
  const [listYear, setListYear] = useState(String(year));
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const yearNumber = Number(listYear.trim());
    if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2100) return setError("Enter a year like 2026");
    start(async () => {
      const r = await createList({ memberId, title: `${occasion.trim()} ${yearNumber}`, occasion, year: yearNumber });
      if (!r.ok) return setError(r.error.message);
      router.refresh();
    });
  };

  return (
    <StickerCard component="section" aria-label="Create a list" padded>
      <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionTitle>Create a list</SectionTitle>
        <TextField select label="Member" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
          {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.displayName}</MenuItem>)}
        </TextField>
        <TextField label="Occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} required />
        <TextField label="Year" value={listYear} onChange={(e) => setListYear(e.target.value)} required slotProps={{ htmlInput: { inputMode: "numeric" } }} />
        <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700 }}>Each list gets its own private share link.</Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={pending || members.length === 0}>Create list</Button>
      </Box>
    </StickerCard>
  );
}
