import Box from "@mui/material/Box";
import Sticker from "@/components/ui/Sticker";
import { tokens } from "@/theme/tokens";
import Pill from "./Pill";

/** The welcome and sign-in frame: a red brand panel and a white form panel (stacked on phones, side by side from 860 px). */
export default function SplitLayout({ badge, children }: { badge: string; children: React.ReactNode }) {
  return (
    <Box component="main" sx={{ flex: 1, minHeight: "100vh", display: "flex", flexDirection: { xs: "column", md: "row" } }}>
      <Box
        sx={{
          backgroundColor: tokens.red,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: { md: "center" },
          minHeight: 236,
          flex: { md: 1 },
          px: { xs: 2, md: 6 },
          pt: { xs: 5, md: 6 },
          pb: { xs: "52px", md: 6 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "4px", "& img": { width: { xs: 62, md: 120 }, height: "auto" } }}>
          <Sticker name="gingerbread" width={120} style={{ transform: "rotate(-8deg)" }} />
          <Sticker name="tree" width={120} />
          <Sticker name="star" width={120} style={{ transform: "rotate(12deg)" }} />
        </Box>
        <Box
          component="p"
          aria-hidden="true"
          sx={{ m: 0, mt: "6px", fontFamily: "var(--font-display), sans-serif", lineHeight: 0.95, fontSize: { xs: 44, md: 84 }, color: tokens.cream, textAlign: "center", textShadow: `3px 3px 0 ${tokens.ink}` }}
        >
          Family<br />Gifts
        </Box>
        <Box sx={{ mt: "10px" }}>
          <Pill tone="yellow">{badge}</Pill>
        </Box>
      </Box>
      <Box
        sx={{
          mt: { xs: "-26px", md: 0 },
          flex: { xs: 1, md: "none" },
          width: { md: 560 },
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          justifyContent: { md: "center" },
          backgroundColor: tokens.white,
          borderTop: { xs: `4px solid ${tokens.ink}`, md: 0 },
          borderLeft: { md: `4px solid ${tokens.ink}` },
          borderRadius: { xs: "32px 32px 0 0", md: 0 },
          px: { xs: "22px", md: 6 },
          pt: { xs: "20px", md: 6 },
          pb: { xs: "24px", md: 6 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
