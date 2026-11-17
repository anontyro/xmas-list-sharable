"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import NextLink from "next/link";
import Note from "@/components/sticker/Note";

/** Shown on a list to someone with no name yet: they can read the list, but reserving and marking interest need a name. */
export default function NamePrompt({ slug }: { slug: string }) {
  return (
    <Note tint="yellow" sticker="gifttag">
      <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
        <p>Tell us your name to reserve or mark interest. The gift&apos;s owner never sees it.</p>
        <Button component={NextLink} href={`/welcome?next=${encodeURIComponent(`/l/${slug}`)}`} size="small" variant="contained">Pick a name and start shopping</Button>
      </Stack>
    </Note>
  );
}
