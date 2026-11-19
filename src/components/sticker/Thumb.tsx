import Box from "@mui/material/Box";
import { tokens } from "@/theme/tokens";
import { TINT_COLOR, type Tint } from "./tint";

/** The 58 px round frame a gift's picture or sticker sits in (the design's `.th`). */
export default function Thumb({ tint, size = 58, children }: { tint: Tint; size?: number; children: React.ReactNode }) {
  return (
    <Box
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
        backgroundColor: TINT_COLOR[tint],
      }}
    >
      {children}
    </Box>
  );
}
