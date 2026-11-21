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
import { addPin } from "@/features/authentication/guest-actions";

function PinForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await addPin(pin);
      if (!r.ok) return setError(r.error.message);
      router.refresh(); // the menu turns into the member menu
      onClose();
    });
  };

  return (
    <form onSubmit={save}>
      <DialogTitle id="set-pin-title">Set a PIN</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <TextField
          label="PIN"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          required
          autoFocus
          autoComplete="new-password"
          slotProps={{ htmlInput: { maxLength: 12, inputMode: "numeric" } }}
          helperText="6 to 12 digits. It lets you sign in to make your own list; the admin approves you first. Your reservations stay."
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={pending}>Set PIN</Button>
      </DialogActions>
    </form>
  );
}

/** A guest adds a PIN and becomes a member waiting for approval, keeping everything they reserved (decision 0026). */
export default function SetPinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="set-pin-title">
      {open && <PinForm onClose={onClose} />}
    </Dialog>
  );
}
