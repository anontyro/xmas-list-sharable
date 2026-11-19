import Box from "@mui/material/Box";
import { tokens } from "@/theme/tokens";
import Sticker from "@/components/ui/Sticker";
import type { StickerName } from "@/components/ui/sticker-names";
import { TINT_COLOR, type Tint } from "./tint";

type NoteProps = {
  tint?: Tint | "white";
  sticker?: StickerName;
  /** Leave unset for a quiet note. Use "alert" or "status" when the note appears in response to something the person did. */
  role?: "alert" | "status";
  children: React.ReactNode;
};

/** The design's note: a tinted box with an optional sticker, for hints and results ("Found the title, picture and price"). */
export default function Note({ tint = "white", sticker, role, children }: NoteProps) {
  return (
    <Box
      role={role}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        px: "12px",
        py: "10px",
        border: `3px solid ${tokens.ink}`,
        borderRadius: "14px",
        fontWeight: 700,
        fontSize: 14,
        color: tokens.ink,
        backgroundColor: TINT_COLOR[tint],
      }}
    >
      {sticker && <Sticker name={sticker} width={36} style={{ flex: "none" }} />}
      <Box sx={{ minWidth: 0, flex: 1, "& p": { m: 0 } }}>{children}</Box>
    </Box>
  );
}
