import Box from "@mui/material/Box";

/** The centred content column: max 1120 px, with the design's page padding and gap. */
export default function PageWrap({ component = "div", children }: { component?: React.ElementType; children: React.ReactNode }) {
  return (
    <Box component={component} sx={{ width: "100%", maxWidth: 1120, mx: "auto", p: { xs: 2, md: "28px 32px" }, display: "flex", flexDirection: "column", gap: { xs: "14px", md: "18px" } }}>
      {children}
    </Box>
  );
}
