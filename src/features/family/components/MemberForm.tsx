"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { createMember, renameMember } from "@/features/family/actions";

/** Adds a member, or renames one when `memberId` is given. */
export default function MemberForm({ memberId, initialName = "" }: { memberId?: string; initialName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = memberId ? await renameMember(memberId, name) : await createMember(name);
      if (!r.ok) return setError(r.error.message);
      if (!memberId) setName("");
      router.refresh();
    });
  };

  return (
    <Stack component="form" direction={{ xs: "column", sm: "row" }} spacing={1} onSubmit={submit} sx={{ alignItems: { sm: "flex-start" } }}>
      <TextField label={memberId ? "Name" : "New member name"} value={name} onChange={(e) => setName(e.target.value)} size="small" required />
      <Button type="submit" variant="contained" disabled={pending}>{memberId ? "Rename" : "Add member"}</Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
