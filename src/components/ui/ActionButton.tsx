"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button, { type ButtonProps } from "@mui/material/Button";

type Props = Omit<ButtonProps, "onClick" | "action"> & {
  /** A server action (usually `.bind`-ed to an id). A `{ ok: false }` result is shown as an error. */
  onAction: () => Promise<unknown>;
  confirmText?: string;
};

export default function ActionButton({ onAction, confirmText, children, ...button }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();

  const run = () => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(undefined);
    start(async () => {
      const r = (await onAction()) as { ok?: boolean; error?: { message: string } } | undefined;
      if (r && r.ok === false) setError(r.error?.message ?? "Something went wrong");
      else router.refresh();
    });
  };

  return (
    <>
      <Button {...button} disabled={pending || button.disabled} onClick={run}>
        {children}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </>
  );
}
