"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { adminLogin } from "@/features/authentication/admin-login";
import { ownerLogin } from "@/features/authentication/owner-login";
import { findMemberByName } from "@/features/authentication/prefill";

type Outcome = { ok: boolean; error?: { message: string } } | undefined;

function useLogin(call: () => Promise<Outcome>, onSuccess: () => void) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await call();
      if (r?.ok) onSuccess();
      else setError(r?.error?.message ?? "Something went wrong");
    });
  };
  return { error, pending, submit };
}

export function AdminLoginForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const { error, pending, submit } = useLogin(() => adminLogin(secret), () => router.push("/admin"));
  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <TextField label="Admin secret" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} required />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" disabled={pending}>Sign in</Button>
    </Stack>
  );
}

/** `initialName` and `initialPin` come from a sign-in link the admin shared. They only fill the form; the person still presses Sign in. */
export function OwnerLoginForm({ members, initialName, initialPin }: { members: { id: string; displayName: string }[]; initialName?: string; initialPin?: string }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState((findMemberByName(members, initialName) ?? members[0])?.id ?? "");
  const [pin, setPin] = useState(initialPin ?? "");
  // Take the PIN out of the address bar (history, bookmarks, screenshots) as soon as it has been used.
  useEffect(() => {
    if (initialName || initialPin) window.history.replaceState(null, "", "/owner/login");
  }, [initialName, initialPin]);
  const { error, pending, submit } = useLogin(() => ownerLogin(memberId, pin), () => router.push("/owner"));
  if (members.length === 0) return <Alert severity="info">No one has been added yet. Ask the family admin.</Alert>;
  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <TextField select label="Who are you?" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
        {members.map((m) => (
          <MenuItem key={m.id} value={m.id}>{m.displayName}</MenuItem>
        ))}
      </TextField>
      <TextField
        label="PIN"
        type="password"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
        required
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" disabled={pending}>Sign in</Button>
    </Stack>
  );
}
