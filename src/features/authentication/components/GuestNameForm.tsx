"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { createGuest } from "@/features/authentication/guest-actions";

/** Asks for a display name and makes this browser a guest. `next` has already been checked by `safeNext` on the server. */
export default function GuestNameForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await createGuest(name, pin);
      if (!r.ok) return setError(r.error.message);
      router.push(next);
      router.refresh();
    });
  };

  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <TextField
        label="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        autoComplete="given-name"
        slotProps={{ htmlInput: { maxLength: 40 } }}
        helperText="The family sees this next to gifts you reserve. No password needed."
      />
      <TextField
        label="PIN (optional)"
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        autoComplete="new-password"
        slotProps={{ htmlInput: { maxLength: 12, inputMode: "numeric" } }}
        helperText="6 to 12 digits. Add one to make your own list; the admin approves you first."
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" fullWidth disabled={pending}>Let&apos;s go</Button>
    </Stack>
  );
}
