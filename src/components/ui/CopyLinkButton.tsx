"use client";

import { useState } from "react";
import Button from "@mui/material/Button";

/** Copies the absolute URL for `path` (e.g. "/l/abc123") and says so in words. */
export default function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outlined" size="small" onClick={copy} aria-live="polite">
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
