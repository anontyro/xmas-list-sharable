"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import NextLink from "next/link";
import Sticker from "@/components/ui/Sticker";
import type { StickerName } from "@/components/ui/sticker-names";
import { tokens } from "@/theme/tokens";
import { TINT_COLOR, type Tint } from "./tint";

type HeroProps = {
  title: string;
  subtitle?: string;
  tint?: Tint;
  /** A real link: "< Family". The label is read as "Back to Family". */
  back?: { label: string; href: string };
  sticker?: { name: StickerName; width: number; rotate?: number };
  /** Something on the right instead of a sticker (the countdown). */
  aside?: React.ReactNode;
};

/** The coloured band under the top bar with the page title (screens 03 to 12). Renders the page's only h1. */
export default function Hero({ title, subtitle, tint = "yellow", back, sticker, aside }: HeroProps) {
  return (
    <Box
      component="section"
      sx={{
        backgroundColor: TINT_COLOR[tint],
        borderBottom: `4px solid ${tokens.ink}`,
        px: { xs: 2, md: 4 },
        pt: { xs: "12px", md: "20px" },
        pb: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1120, mx: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <Box sx={{ minWidth: 0 }}>
          {back && (
            <Button component={NextLink} href={back.href} size="small" aria-label={`Back to ${back.label}`} sx={{ mb: "4px", backgroundColor: tokens.white, color: tokens.ink }}>
              <span aria-hidden="true">&lt;&nbsp;</span>
              {back.label}
            </Button>
          )}
          <Box component="h1" sx={{ m: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, lineHeight: 1, fontSize: { xs: 32, md: 46 }, overflowWrap: "anywhere" }}>
            {title}
          </Box>
          {subtitle && <Box component="p" sx={{ m: 0, mt: "4px", fontWeight: 800, fontSize: { xs: 14, md: 16 } }}>{subtitle}</Box>}
        </Box>
        {sticker && <Sticker name={sticker.name} width={sticker.width} style={{ flex: "none", transform: `rotate(${sticker.rotate ?? 0}deg)` }} />}
        {aside}
      </Box>
    </Box>
  );
}
