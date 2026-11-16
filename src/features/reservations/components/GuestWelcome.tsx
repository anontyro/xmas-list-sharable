"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createGuest, renameGuest } from "@/features/authentication/guest-actions";

/** Asks for a name before any action; once named, shows who you are and lets you change it. */
export default function GuestWelcome({ currentName }: { currentName: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = currentName ? await renameGuest(name) : await createGuest(name);
      if (!r.ok) return setError(r.error.message);
      setEditing(false);
      router.refresh();
    });
  };

  if (currentName && !editing) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography>Shopping as <strong>{currentName}</strong></Typography>
        <Button size="small" onClick={() => setEditing(true)}>Change name</Button>
      </Stack>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>{currentName ? "Change your name" : "Who's shopping?"}</Typography>
      {!currentName && <Typography color="text.secondary" sx={{ mb: 2 }}>Pick a name so you and the family can see who is buying what. The gift&apos;s owner never sees this.</Typography>}
      <Stack component="form" spacing={1} onSubmit={save}>
        <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} size="small" required slotProps={{ htmlInput: { maxLength: 40 } }} />
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={pending}>{currentName ? "Save" : "Continue"}</Button>
          {currentName && <Button onClick={() => setEditing(false)}>Cancel</Button>}
        </Stack>
      </Stack>
    </Paper>
  );
}
