"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { renameGuest } from "@/features/authentication/guest-actions";

function NameForm({ currentName, onClose }: { currentName: string; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await renameGuest(name);
      if (!r.ok) return setError(r.error.message);
      router.refresh();
      onClose();
    });
  };

  return (
    <form onSubmit={save}>
      <DialogTitle id="change-name-title">Change my name</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus slotProps={{ htmlInput: { maxLength: 40 } }} helperText="The family sees this next to gifts you reserve." />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={pending}>Save</Button>
      </DialogActions>
    </form>
  );
}

/** Rename the guest. Claims point at the guest id, so everything they reserved shows the new name. */
export default function ChangeNameDialog({ open, currentName, onClose }: { open: boolean; currentName: string; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="change-name-title">
      {/* Mounted only while open, so it always starts from the current name. */}
      {open && <NameForm currentName={currentName} onClose={onClose} />}
    </Dialog>
  );
}
