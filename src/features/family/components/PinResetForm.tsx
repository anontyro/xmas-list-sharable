"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { ownerLoginPath } from "@/features/authentication/prefill";
import { setOwnerPin } from "@/features/family/actions";
import Typography from "@mui/material/Typography";

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
      <Typography variant="subtitle2" component="h3" sx={{ pt: 1 }}>Sign-in link for {memberName}</Typography>
      <Typography variant="body2" color="text.secondary">
        Opens the sign-in page with their name filled in. They can change their PIN once they are in, and you can still reset it here.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="body2" sx={{ wordBreak: "break-all", flexGrow: 1 }}>{ownerLoginPath(memberName)}</Typography>
        <CopyLinkButton path={ownerLoginPath(memberName)} what={`sign-in link for ${memberName}`} />
      </Stack>
      {shareWithPin && (
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Or a link that also has the PIN you just set. Anyone who sees this link can sign in as {memberName}, so send it privately.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="body2" sx={{ wordBreak: "break-all", flexGrow: 1 }}>{ownerLoginPath(memberName, shareWithPin)}</Typography>
            <CopyLinkButton path={ownerLoginPath(memberName, shareWithPin)} what={`sign-in link for ${memberName} with PIN`} />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
