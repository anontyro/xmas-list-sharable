"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { adminLogin } from "@/features/authentication/admin-login";

export default function AdminSignIn() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await adminLogin(secret);
      if (r.ok) router.push("/admin");
      else setError(r.error.message);
    });
  };

  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <TextField label="Admin secret" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} required />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" fullWidth disabled={pending}>Sign in</Button>
    </Stack>
  );
}
