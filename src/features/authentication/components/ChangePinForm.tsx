"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { changeOwnPin } from "@/features/authentication/owner-login";

const pinField = { type: "password", autoComplete: "off", size: "small", required: true, slotProps: { htmlInput: { inputMode: "numeric" } } } as const;

/** An owner changes their own PIN. The family admin can still set a new one later if it is forgotten. */
export default function ChangePinForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string }>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) return setMessage({ severity: "error", text: "The new PINs don't match." });
    setMessage(undefined);
    start(async () => {
      const r = await changeOwnPin(current, next);
      if (r.ok) {
        setCurrent("");
        setNext("");
        setAgain("");
      }
      setMessage(r.ok ? { severity: "success", text: "PIN changed" } : { severity: "error", text: r.error.message });
    });
  };

  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} aria-label="Change my PIN">
      <TextField label="Current PIN" value={current} onChange={(e) => setCurrent(e.target.value)} {...pinField} />
      <TextField label="New PIN" value={next} onChange={(e) => setNext(e.target.value)} helperText="6 to 12 digits" {...pinField} />
      <TextField label="New PIN again" value={again} onChange={(e) => setAgain(e.target.value)} {...pinField} />
      <Button type="submit" variant="outlined" disabled={pending} sx={{ alignSelf: "flex-start" }}>Change PIN</Button>
      {message && <Alert severity={message.severity}>{message.text}</Alert>}
    </Stack>
  );
}
