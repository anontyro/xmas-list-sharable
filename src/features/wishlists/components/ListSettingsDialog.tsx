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
import Choice from "@/components/sticker/Choice";
import { updateListSettings } from "../list-actions";

/** The list's title and whether its gifts are ranked. Switching never changes a gift's stored priority, so switching back brings the groups back. */
export default function ListSettingsDialog({ listId, title: initialTitle, ranked: initialRanked }: { listId: string; title: string; ranked: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [ranked, setRanked] = useState(initialRanked);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await updateListSettings(listId, { title, ranked });
      if (!r.ok) return setError(r.error.message);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="contained" color="inherit" aria-haspopup="dialog" onClick={() => { setTitle(initialTitle); setRanked(initialRanked); setError(undefined); setOpen(true); }}>List settings</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby="list-settings-title">
        <form onSubmit={save}>
          <DialogTitle id="list-settings-title">List settings</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required slotProps={{ htmlInput: { maxLength: 80 } }} />
              <div role="group" aria-label="Order">
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  <Choice on={ranked} onClick={() => setRanked(true)}>Most wanted first</Choice>
                  <Choice on={!ranked} onClick={() => setRanked(false)}>No particular order</Choice>
                </Stack>
              </div>
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={pending}>Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
