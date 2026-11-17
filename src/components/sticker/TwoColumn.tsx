import Box from "@mui/material/Box";

type Props = {
  main: React.ReactNode;
  side: React.ReactNode;
  /** On phones the sidebar normally comes first (screens 04, 05); set this to put it after the content (screens 06, 07, 09, 10). */
  sideLast?: boolean;
};

/** Content plus a 360 px sidebar from 860 px; one column below, with the sidebar placed first or last. */
export default function TwoColumn({ main, side, sideLast }: Props) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 360px" }, gap: { xs: "14px", md: "22px" }, alignItems: { md: "start" } }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>{main}</Box>
      <Box component="aside" sx={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0, order: { xs: sideLast ? 1 : -1, md: 0 } }}>
        {side}
      </Box>
    </Box>
  );
}
