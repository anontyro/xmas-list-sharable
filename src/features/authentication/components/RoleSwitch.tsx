"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import NextLink from "next/link";

/** The two doors on the welcome frame. Both are links: shopping is `/welcome`, owner is `/owner/login`. */
export default function RoleSwitch({ active, next }: { active: "guest" | "owner"; next?: string }) {
  const guestHref = next && next !== "/" ? `/welcome?next=${encodeURIComponent(next)}` : "/welcome";
  return (
    <Stack direction="row" spacing={1} component="nav" aria-label="Who are you?">
      <Button component={NextLink} href={guestHref} fullWidth variant="contained" color={active === "guest" ? "yellow" : "inherit"} aria-current={active === "guest" ? "page" : undefined}>
        I&apos;m shopping
      </Button>
      <Button component={NextLink} href="/owner/login" fullWidth variant="contained" color={active === "owner" ? "yellow" : "inherit"} aria-current={active === "owner" ? "page" : undefined}>
        I own a list
      </Button>
    </Stack>
  );
}
