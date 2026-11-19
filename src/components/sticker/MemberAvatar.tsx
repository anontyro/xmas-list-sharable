import Box from "@mui/material/Box";
import Sticker from "@/components/ui/Sticker";
import type { StickerName } from "@/components/ui/sticker-names";
import { tokens } from "@/theme/tokens";
import { TINT_COLOR, tintFor } from "./tint";

/** A member's picture sticker, or their first initial on a colour that is always the same for them. Decorative: the name is shown beside it. */
export default function MemberAvatar({ id, name, avatar, size = 56 }: { id: string; name: string; avatar?: StickerName | null; size?: number }) {
  const initial = (Array.from(name.trim())[0] ?? "?").toUpperCase();
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        flex: "none",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `3px solid ${tokens.ink}`,
        borderRadius: "50%",
        fontFamily: "var(--font-display), sans-serif",
        fontSize: Math.round(size * 0.46),
        color: tokens.ink,
        backgroundColor: TINT_COLOR[tintFor(id)],
      }}
    >
      {avatar ? <Sticker name={avatar} width={Math.round(size * 0.7)} /> : initial}
    </Box>
  );
}
