"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Sticker from "@/components/ui/Sticker";
import { AVATAR_STICKERS, type AvatarSticker } from "@/features/family/avatars";
import { TINT_COLOR, TINTS } from "@/components/sticker/tint";
import { tokens } from "@/theme/tokens";

const LABELS: Record<AvatarSticker, string> = {
  gingerbread: "Gingerbread",
  reindeer: "Reindeer",
  star: "Star",
  holly: "Holly",
  child: "Child",
  santahat: "Santa hat",
  snowflake: "Snowflake",
  snowglobe: "Snow globe",
};

/** The eight picture stickers as a radio group, plus "No picture" (their first initial is used). */
export default function AvatarPicker({ value, onChange }: { value: AvatarSticker | null; onChange: (v: AvatarSticker | null) => void }) {
  return (
    <Box>
      <Box component="p" id="avatar-label" sx={{ m: 0, mb: "6px", fontWeight: 800, fontSize: 14 }}>Picture (optional)</Box>
      <Box role="radiogroup" aria-labelledby="avatar-label" sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {AVATAR_STICKERS.map((name, i) => {
          const on = value === name;
          return (
            <Box
              key={name}
              component="button"
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${LABELS[name]} picture`}
              onClick={() => onChange(name)}
              sx={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 0,
                cursor: "pointer",
                border: `3px solid ${tokens.ink}`,
                borderRadius: "14px",
                backgroundColor: TINT_COLOR[TINTS[i % TINTS.length]],
                boxShadow: on ? `0 0 0 3px ${tokens.red}` : "none",
              }}
            >
              <Sticker name={name} width={32} />
            </Box>
          );
        })}
      </Box>
      <Button size="small" variant="ghost" aria-pressed={value === null} onClick={() => onChange(null)} sx={{ mt: "8px" }}>No picture</Button>
    </Box>
  );
}
