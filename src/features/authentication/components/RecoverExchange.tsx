"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";

/** Reads the token from the address fragment, removes it from the address bar at once, then swaps it for a session. */
export default function RecoverExchange() {
  const [state, setState] = useState<"working" | "failed" | "throttled">("working");
  const started = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("t");
    window.history.replaceState(null, "", "/recover");
    Promise.resolve(token && fetch("/api/recovery/exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store" }))
      .then((r) => (r && r.status === 204 ? (router.replace("/planner"), router.refresh()) : setState(r && r.status === 429 ? "throttled" : "failed")))
      .catch(() => setState("failed"));
  }, [router]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">Getting your plans back</Typography>
      {state === "working" && <Typography role="status">One moment…</Typography>}
      {state === "failed" && <Alert severity="warning">This link doesn&apos;t work. It may have been replaced or turned off.</Alert>}
      {state === "throttled" && <Alert severity="warning">Too many attempts. Try again in a few minutes.</Alert>}
      {state !== "working" && <AppLink href="/">Go to the family page</AppLink>}
    </Stack>
  );
}
