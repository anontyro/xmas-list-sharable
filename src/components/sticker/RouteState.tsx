"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Sticker from "@/components/ui/Sticker";
import PageWrap from "./PageWrap";

/** `loading.tsx` for a route group: announced politely to screen readers. */
export function LoadingState() {
  return (
    <PageWrap>
      <Box role="status" sx={{ display: "flex", alignItems: "center", gap: "12px", fontFamily: "var(--font-display), sans-serif", fontSize: 24 }}>
        <Sticker name="clock" width={56} />
        One moment…
      </Box>
    </PageWrap>
  );
}

/** `error.tsx` for a route group. Shows no error text: the message can hold details that are not for the page. */
export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <PageWrap>
      <Box role="alert" sx={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <Sticker name="parcel" width={56} />
        <Box component="h1" sx={{ m: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 28 }}>Something went wrong</Box>
        <Button variant="contained" onClick={reset}>Try again</Button>
      </Box>
    </PageWrap>
  );
}
