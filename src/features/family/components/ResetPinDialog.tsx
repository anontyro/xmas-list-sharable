"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import PinResetForm from "./PinResetForm";

/** "Reset PIN" (or a red "Set PIN" when none is set) opens the PIN form and, after saving, the sign-in links (decision 0004). */
export default function ResetPinDialog({ memberId, memberName, hasPin }: { memberId: string; memberName: string; hasPin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" variant="contained" color={hasPin ? "yellow" : "primary"} aria-haspopup="dialog" aria-label={`${hasPin ? "Reset PIN" : "Set PIN"}: ${memberName}`} onClick={() => setOpen(true)}>
        {hasPin ? "Reset PIN" : "Set PIN"}
      </Button>
      {/* Mounted only while open so the form (and the PIN it keeps for the link) is forgotten on close. */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby={`pin-${memberId}`}>
        <DialogTitle id={`pin-${memberId}`}>{hasPin ? "Reset PIN" : "Set PIN"} for {memberName}</DialogTitle>
        <DialogContent>
          {open && <PinResetForm memberId={memberId} memberName={memberName} hasPin={hasPin} />}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
