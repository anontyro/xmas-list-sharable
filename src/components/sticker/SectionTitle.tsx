import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

/** The display-font heading that names a card or a sidebar block ("Share your list", "How it works"). A level 2 heading unless `component` says otherwise. */
export default function SectionTitle({ children, component = "h2", sx }: { children: React.ReactNode; component?: React.ElementType; sx?: SxProps<Theme> }) {
  return (
    <Box component={component} sx={[{ m: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 20 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {children}
    </Box>
  );
}
