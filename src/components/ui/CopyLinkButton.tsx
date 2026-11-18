"use client";

import { useState } from "react";
import Button from "@mui/material/Button";

/** Copies the absolute URL for `path` (e.g. "/l/abc123") and says so in words. `what` tells screen-reader users which link when a page has several. */
export default function CopyLinkButton({ path, what }: { path: string; what?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setState("copied");
    } catch {
      setState("failed"); // the browser refused (no permission, or not a secure page)
    }
    setTimeout(() => setState("idle"), 2000);
  };

  return (
    <Button variant="outlined" size="small" onClick={copy} aria-live="polite" aria-label={what && state === "idle" ? `Copy link: ${what}` : undefined}>
      {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "Copy link"}
    </Button>
  );
}
