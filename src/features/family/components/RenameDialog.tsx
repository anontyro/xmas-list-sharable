"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { renameMember } from "@/features/family/actions";
import type { AvatarSticker } from "@/features/family/avatars";
import AvatarPicker from "./AvatarPicker";

export default function RenameDialog({ memberId, name: current, avatar: currentAvatar }: { memberId: string; name: string; avatar: AvatarSticker | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(current);
  const [avatar, setAvatar] = useState(currentAvatar);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await renameMember(memberId, name, avatar);
      if (!r.ok) return setError(r.error.message);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button size="small" variant="contained" color="inherit" aria-haspopup="dialog" aria-label={`Rename ${current}`} onClick={() => { setName(current); setAvatar(currentAvatar); setError(undefined); setOpen(true); }}>Rename</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby={`rename-${memberId}`}>
        <form onSubmit={save}>
          <DialogTitle id={`rename-${memberId}`}>Rename {current}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
              <AvatarPicker value={avatar} onChange={setAvatar} />
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={pending}>Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
