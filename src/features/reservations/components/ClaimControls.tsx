"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button, { type ButtonProps } from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import { purchaseItem, releaseItem, reserveItem, showInterest, withdrawInterest } from "@/features/reservations/actions";
import type { GuestItemStateName } from "@/features/reservations/guest-claim-view";
import type { Result } from "@/lib/result";

type ButtonLook = Pick<ButtonProps, "variant" | "color">;
const red = { variant: "contained", color: "primary" } as const;
const pink = { variant: "contained", color: "pink" } as const;
const mint = { variant: "contained", color: "mint" } as const;
const ghost = { variant: "ghost", color: "inherit" } as const;

/** The buttons a guest may press for one gift, given its state. Another guest's claim shows none. */
export default function ClaimControls({ itemId, itemTitle, state }: { itemId: string; itemTitle: string; state: GuestItemStateName }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  const run = (call: () => Promise<Result<unknown>>) => {
    setMessage(undefined);
    start(async () => {
      const r = await call();
      if (!r.ok) setMessage(r.error.message);
      router.refresh(); // always show the true state, especially after a conflict
    });
  };

  const buttons = {
    available: [["Interested", () => showInterest(itemId), pink], ["Reserve", () => reserveItem(itemId), red]],
    interested: [["Not interested", () => withdrawInterest(itemId), ghost], ["Reserve", () => reserveItem(itemId), red]],
    reserved_by_you: [["Mark purchased", () => purchaseItem(itemId), mint], ["Release", () => releaseItem(itemId), ghost]],
    purchased_by_you: [],
    reserved_by_other: [],
    purchased_by_other: [],
  } as const satisfies Record<GuestItemStateName, readonly (readonly [string, () => Promise<Result<unknown>>, ButtonLook])[]>;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {buttons[state].map(([label, call, look]) => (
          <Button key={label} size="small" {...look} disabled={pending} onClick={() => run(call)} aria-label={`${label}: ${itemTitle}`}>
            {label}
          </Button>
        ))}
        {state === "purchased_by_you" && (
          <Button size="small" variant="ghost" disabled={pending} onClick={() => setConfirming(true)} aria-label={`Undo purchase: ${itemTitle}`}>
            Undo purchase
          </Button>
        )}
      </Stack>
      {message && <Alert severity="warning">{message}</Alert>}
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Undo this purchase?</DialogTitle>
        <DialogContent>
          <DialogContentText>Other guests will be able to reserve &ldquo;{itemTitle}&rdquo; again.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Keep it</Button>
          <Button color="error" onClick={() => { setConfirming(false); run(() => releaseItem(itemId, true)); }}>Undo purchase</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
