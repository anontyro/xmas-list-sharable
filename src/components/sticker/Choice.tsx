"use client";

import Button from "@mui/material/Button";

/** A toggle button (a sort, a priority, "Paste a link"): the state is in `aria-pressed` and the filled look, never colour alone. */
export default function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button size="small" variant="contained" color={on ? "yellow" : "inherit"} aria-pressed={on} onClick={onClick}>
      {children}
    </Button>
  );
}
