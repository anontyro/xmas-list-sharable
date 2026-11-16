"use client";

import { useEffect, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { createRecoveryLink, recoveryLinkStatus, revokeRecoveryLink } from "@/features/authentication/recovery-actions";

/** Make, copy or turn off the private link that brings a guest's planner and reservations to another device. */
export default function SaveAccessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [path, setPath] = useState<string>();
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    recoveryLinkStatus().then((r) => r.ok && setActive(r.data.active));
  }, [open]);

  const close = () => {
    setPath(undefined); // the link is shown once; closing forgets it
    setError(undefined);
    onClose();
  };

  const make = () =>
    start(async () => {
      setError(undefined);
      const r = await createRecoveryLink();
      if (!r.ok) return setError(r.error.message);
      setPath(r.data.path);
      setActive(true);
    });

  const revoke = () =>
    start(async () => {
      setError(undefined);
      const r = await revokeRecoveryLink();
      if (!r.ok) return setError(r.error.message);
      setPath(undefined);
      setActive(false);
    });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="save-access-title">
      <DialogTitle id="save-access-title">Save access</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Get a private link that brings your planner and reservations to another phone or computer. Open it there once and you are signed in as you.
          </Typography>
          <Alert severity="warning">
            Anyone who has this link can see and change your plans and reservations, so keep it to yourself. If you lose it and every browser you use, your plans may be lost.
          </Alert>
          {path && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField label="Your private link" size="small" fullWidth value={`${typeof window === "undefined" ? "" : window.location.origin}${path}`} slotProps={{ input: { readOnly: true } }} />
              <CopyLinkButton path={path} />
            </Stack>
          )}
          {!path && active && <Typography color="text.secondary">You have a link already. Making a new one turns the old one off.</Typography>}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {active && <Button color="error" onClick={revoke} disabled={pending}>Turn off link</Button>}
        <Button variant="contained" onClick={make} disabled={pending}>{active ? "Make a new link" : "Make a link"}</Button>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
