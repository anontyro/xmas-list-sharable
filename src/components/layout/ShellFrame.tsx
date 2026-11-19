import Box from "@mui/material/Box";
import TabBar from "./TabBar";
import TopBar from "./TopBar";
import type { NavItem } from "./nav";

/** Top bar, page, and (on phones, when there is somewhere to go) the tab bar, filling the screen so the tabs sit at the bottom. */
export default function ShellFrame({ brandHref, items, right, children }: { brandHref: string; items: NavItem[]; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar brandHref={brandHref} items={items} right={right} />
      <Box component="main" sx={{ flex: 1 }}>{children}</Box>
      {items.length > 1 && <TabBar items={items} />}
    </Box>
  );
}
