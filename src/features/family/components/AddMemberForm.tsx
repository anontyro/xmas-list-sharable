"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import SectionTitle from "@/components/sticker/SectionTitle";
import StickerCard from "@/components/sticker/StickerCard";
import { createMember } from "@/features/family/actions";
import type { AvatarSticker } from "@/features/family/avatars";
import AvatarPicker from "./AvatarPicker";
import SignInLinks from "./SignInLinks";

export default function AddMemberForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarSticker | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ name: string; pin: string }>(); // kept only on this screen, so the admin can send a sign-in link with the PIN in it
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await createMember({ displayName: name, avatar, pin: pin || undefined });
      if (!r.ok) return setError(r.error.message);
      setCreated(pin ? { name: name.trim(), pin } : undefined);
      setName("");
      setAvatar(null);
      setPin("");
      router.refresh();
    });
  };

  return (
    <StickerCard component="section" aria-label="Add a member" padded>
      <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <SectionTitle>Add a member</SectionTitle>
        <TextField label="Display name" placeholder="e.g. Grandad Joe" value={name} onChange={(e) => setName(e.target.value)} required />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <TextField
          label="Owner PIN"
          type="password"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          helperText="6 or more digits. You can reset it later, but you can never see it."
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={pending}>Add member</Button>
      </Box>
      {created && (
        <Alert severity="success" sx={{ mt: 1.5, display: "block" }}>
          {created.name} was added.
          <SignInLinks name={created.name} pin={created.pin} />
          <Button size="small" onClick={() => setCreated(undefined)}>Done</Button>
        </Alert>
      )}
    </StickerCard>
  );
}
