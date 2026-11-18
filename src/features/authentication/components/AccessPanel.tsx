"use client";

import StepNumber from "@/components/sticker/StepNumber";
import SectionTitle from "@/components/sticker/SectionTitle";
import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputBase from "@mui/material/InputBase";
import MemberAvatar from "@/components/sticker/MemberAvatar";
import Note from "@/components/sticker/Note";
import Pill from "@/components/sticker/Pill";
import StickerCard from "@/components/sticker/StickerCard";
import TwoColumn from "@/components/sticker/TwoColumn";
import { createRecoveryLink, revokeRecoveryLink } from "@/features/authentication/recovery-actions";
import { tokens } from "@/theme/tokens";

export type AccessStatus = { active: boolean; createdAt: string | null };

const London = { timeZone: "Europe/London" } as const;

/** "Active · made today", "Active · made 3 Nov" or "No link yet". Dates are London dates, so the server and the browser say the same thing. */
export function statusLabel({ active, createdAt }: AccessStatus, now: Date = new Date()): string {
  if (!active || !createdAt) return "No link yet";
  const day = (d: Date) => d.toLocaleDateString("en-GB", { ...London, year: "numeric", month: "numeric", day: "numeric" });
  const made = new Date(createdAt);
  return day(made) === day(now) ? "Active · made today" : `Active · made ${made.toLocaleDateString("en-GB", { ...London, day: "numeric", month: "short" })}`;
}

const help = { m: 0, fontSize: 13, fontWeight: 700, color: "text.secondary" } as const;

/** Make, copy or turn off the private link. The link is only ever in this component's state, from the moment it is made until the page is left. */
export default function AccessPanel({ guestId, name, status: initial }: { guestId: string; name: string; status: AccessStatus }) {
  const [status, setStatus] = useState(initial);
  const [link, setLink] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const make = () =>
    start(async () => {
      setError(undefined);
      const r = await createRecoveryLink();
      if (!r.ok) return setError(r.error.message);
      setLink(`${window.location.origin}${r.data.path}`);
      setCopied(false);
      setStatus({ active: true, createdAt: new Date().toISOString() });
    });

  const revoke = () =>
    start(async () => {
      setError(undefined);
      const r = await revokeRecoveryLink();
      if (!r.ok) return setError(r.error.message);
      setLink(undefined);
      setStatus({ active: false, createdAt: null });
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  };

  const main = (
    <>
      <StickerCard component="section" padded aria-label="Private link" sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <SectionTitle>Your private link</SectionTitle>
          <Pill tone={status.active ? "mint" : undefined}>{statusLabel(status)}</Pill>
        </Box>
        {link ? (
          <>
            <StickerCard tint="cream" sx={{ p: "12px 14px" }}>
              <InputBase
                readOnly
                fullWidth
                value={link}
                onFocus={(e) => e.target.select()}
                slotProps={{ input: { "aria-label": "Your private link" } }}
                sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 14, fontWeight: 700, color: tokens.ink }}
              />
            </StickerCard>
            <Button size="large" variant="contained" onClick={copy} aria-live="polite">{copied ? "Copied" : "Copy link"}</Button>
            <Box component="p" sx={help}>Copy it now: for your safety we can&apos;t show it again.</Box>
          </>
        ) : (
          <Box component="p" sx={{ m: 0, fontWeight: 700 }}>
            {status.active
              ? "For your safety we can't show your link again. If you haven't saved it, make a new one: the old one stops working."
              : "Make a link, then keep it somewhere private. It brings your planner and reservations to another device."}
          </Box>
        )}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {status.active ? (
            <>
              <Button variant="contained" color="sky" sx={{ flex: "1 1 160px" }} disabled={pending} onClick={make}>Make a new link</Button>
              <Button variant="ghost" sx={{ flex: "1 1 160px" }} disabled={pending} onClick={revoke}>Turn link off</Button>
            </>
          ) : (
            <Button size="large" variant="contained" sx={{ flex: 1 }} disabled={pending} onClick={make}>Make a link</Button>
          )}
        </Box>
        {status.active && <Box component="p" sx={help}>A new link switches the old one off. Devices you&apos;re already signed in on stay signed in.</Box>}
        {error && <Note tint="pink" role="alert"><p>{error}</p></Note>}
      </StickerCard>
      <Note tint="yellow" sticker="gifttag">
        <p>Anyone with this link can open your planner, so keep it somewhere private. If you lose this browser and the link, your planner can&apos;t be recovered.</p>
      </Note>
    </>
  );

  const side = (
    <>
      <StickerCard component="section" padded sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <SectionTitle>How it works</SectionTitle>
        <StepNumber n={1}>{"Copy your link and save it in a private place, like a notes app or password manager."}</StepNumber>
        <StepNumber n={2}>{"Open the link on your other phone or laptop."}</StepNumber>
        <StepNumber n={3}>{`You're back as ${name}, with your reservations, budget and notes.`}</StepNumber>
      </StickerCard>
      <StickerCard tint="cream" padded sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <MemberAvatar id={guestId} name={name} />
        <Box component="p" sx={{ m: 0, flex: 1, fontWeight: 700, fontSize: 14 }}>You&apos;re {name} on this browser. Your name, reservations and planner stay with you.</Box>
      </StickerCard>
    </>
  );

  return <TwoColumn sideLast main={main} side={side} />;
}
