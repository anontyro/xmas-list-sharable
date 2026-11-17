"use client";

import Box from "@mui/material/Box";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Sticker from "@/components/ui/Sticker";
import { shadows, tokens } from "@/theme/tokens";
import { isActive, type NavItem } from "./nav";

/** The phone tab bar (below 860 px): the same destinations as the top links, with a sticker each. */
export default function TabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        display: { xs: "flex", md: "none" },
        gap: "6px",
        px: "10px",
        pt: 1,
        pb: "calc(14px + env(safe-area-inset-bottom))",
        backgroundColor: tokens.white,
        borderTop: `4px solid ${tokens.ink}`,
      }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.match);
        return (
          <Box
            key={item.href}
            component={NextLink}
            href={item.href}
            aria-current={active ? "page" : undefined}
            sx={{
              flex: 1,
              minHeight: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1px",
              border: "3px solid transparent",
              borderRadius: "16px",
              fontWeight: 800,
              fontSize: 12,
              textDecoration: "none",
              color: tokens.ink,
              ...(active ? { backgroundColor: tokens.yellow, borderColor: tokens.ink, boxShadow: shadows.button } : {}),
            }}
          >
            <Sticker name={item.sticker} width={30} style={{ filter: "none" }} />
            {item.tabLabel ?? item.label}
          </Box>
        );
      })}
    </Box>
  );
}
