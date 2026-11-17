"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";
import { EXCHANGE_MESSAGES, exchangeRecoveryToken } from "@/features/authentication/exchange-token";

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
    if (!token) {
      queueMicrotask(() => setState("failed"));
      return;
    }
    exchangeRecoveryToken(token).then((result) => {
      if (result === "ok") {
        router.replace("/planner");
        router.refresh();
      } else setState(result);
    });
  }, [router]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">Getting your plans back</Typography>
      {state === "working" && <Typography role="status">One moment…</Typography>}
      {state !== "working" && <Alert severity="warning">{EXCHANGE_MESSAGES[state]}</Alert>}
      {state !== "working" && <AppLink href="/">Go to the family page</AppLink>}
    </Stack>
  );
}
