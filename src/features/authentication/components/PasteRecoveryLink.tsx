"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Note from "@/components/sticker/Note";
import { EXCHANGE_MESSAGES, exchangeRecoveryToken } from "@/features/authentication/exchange-token";
import { tokenFromPastedLink } from "@/features/authentication/recovery-link";

/** "Been here before?": paste the saved recovery link (or just its token) to get this guest back on a new device. */
export default function PasteRecoveryLink() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const token = tokenFromPastedLink(pasted);
    setPasted(""); // gone from the page as soon as it has been read
    if (!token) return setError("That doesn't look like a recovery link. Paste the whole link you saved.");
    start(async () => {
      const result = await exchangeRecoveryToken(token);
      if (result !== "ok") return setError(EXCHANGE_MESSAGES[result]);
      router.push("/planner");
      router.refresh();
    });
  };

  return (
    <Note tint="sky" sticker="badge">
      <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
        <p>Been here before on another phone or laptop? Use your saved recovery link to get your planner back.</p>
        {!open && <Button size="small" onClick={() => setOpen(true)}>Use recovery link</Button>}
        {open && (
          <Stack component="form" spacing={1} onSubmit={submit} sx={{ width: "100%" }}>
            <TextField label="Your recovery link" value={pasted} onChange={(e) => setPasted(e.target.value)} size="small" required autoFocus autoComplete="off" spellCheck={false} />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" size="small" variant="contained" disabled={pending} sx={{ alignSelf: "flex-start" }}>Get my planner back</Button>
          </Stack>
        )}
      </Stack>
    </Note>
  );
}
