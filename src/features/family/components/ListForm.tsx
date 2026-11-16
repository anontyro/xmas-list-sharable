"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { createList } from "@/features/family/actions";

export default function ListForm({ memberId, year }: { memberId: string; year: number }) {
  const router = useRouter();
  const [title, setTitle] = useState(`Christmas ${year}`);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await createList({ memberId, title, occasion: "Christmas", year });
      if (!r.ok) return setError(r.error.message);
      router.refresh();
    });
  };

  return (
    <Stack component="form" direction={{ xs: "column", sm: "row" }} spacing={1} onSubmit={submit} sx={{ alignItems: { sm: "flex-start" } }}>
      <TextField label="List title" value={title} onChange={(e) => setTitle(e.target.value)} size="small" required />
      <Button type="submit" variant="contained" disabled={pending}>Create list</Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
