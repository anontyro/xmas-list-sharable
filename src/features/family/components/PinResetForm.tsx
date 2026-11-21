"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { setOwnerPin } from "@/features/family/actions";
import SignInLinks from "./SignInLinks";

export default function PinResetForm({ memberId, memberName, hasPin }: { memberId: string; memberName: string; hasPin: boolean }) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string }>();
  const [shareWithPin, setShareWithPin] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(undefined);
    start(async () => {
      const r = await setOwnerPin(memberId, pin);
      if (r.ok) {
        setShareWithPin(pin); // kept only on this screen, so the admin can send a link that has the PIN in it
        setPin("");
      }
      setMessage(r.ok ? { severity: "success", text: "PIN saved" } : { severity: "error", text: r.error.message });
    });
  };

  return (
    <Stack component="form" spacing={1} onSubmit={submit}>
      <TextField
        label={hasPin ? "New PIN" : "Set PIN"}
        type="password"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        helperText="6 to 12 digits"
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
        size="small"
        required
      />
      <Button type="submit" variant="contained" disabled={pending}>{hasPin ? "Reset PIN" : "Save PIN"}</Button>
      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      <SignInLinks name={memberName} pin={shareWithPin} />
    </Stack>
  );
}
