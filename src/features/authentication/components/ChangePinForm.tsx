"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Note from "@/components/sticker/Note";
import { changeOwnPin } from "@/features/authentication/owner-login";

const pinField = { type: "password", autoComplete: "off", size: "small", required: true, fullWidth: true, slotProps: { htmlInput: { inputMode: "numeric" } } } as const;

/** An owner changes their own PIN. The family admin can still set a new one later if it is forgotten. */
export default function ChangePinForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [message, setMessage] = useState<{ tint: "mint" | "pink"; text: string }>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) return setMessage({ tint: "pink", text: "The new PINs don't match." });
    setMessage(undefined);
    start(async () => {
      const r = await changeOwnPin(current, next);
      if (r.ok) {
        setCurrent("");
        setNext("");
        setAgain("");
      }
      setMessage(r.ok ? { tint: "mint", text: "PIN changed" } : { tint: "pink", text: r.error.message });
    });
  };

  return (
    <Box component="form" onSubmit={submit} aria-label="Change my PIN" sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <TextField label="Current PIN" value={current} onChange={(e) => setCurrent(e.target.value)} {...pinField} />
      <TextField label="New PIN" value={next} onChange={(e) => setNext(e.target.value)} helperText="6 to 12 digits" {...pinField} />
      <TextField label="New PIN again" value={again} onChange={(e) => setAgain(e.target.value)} {...pinField} />
      <Button type="submit" size="large" variant="contained" disabled={pending}>Change PIN</Button>
      {message && <Note tint={message.tint} role={message.tint === "pink" ? "alert" : "status"}><p>{message.text}</p></Note>}
      <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700, color: "text.secondary" }}>If you forget it, the family admin can set a new one.</Box>
    </Box>
  );
}
