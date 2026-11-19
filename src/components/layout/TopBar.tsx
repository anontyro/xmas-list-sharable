"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Sticker from "@/components/ui/Sticker";
import { RED_BAR_CLASS, shadows, tokens } from "@/theme/tokens";
import { isActive, type NavItem } from "./nav";

/** The red bar: brand, links (from 860 px; phones use the tab bar) and whatever the role puts on the right. */
export default function TopBar({ brandHref, items, right }: { brandHref: string; items: NavItem[]; right?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AppBar position="static" component="header" className={RED_BAR_CLASS}>
      <Toolbar sx={{ gap: "12px", px: { xs: 2, md: 4 } }}>
        <Box
          component={NextLink}
          href={brandHref}
          sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 44, color: tokens.cream, textDecoration: "none", fontFamily: "var(--font-display), sans-serif", fontSize: 24, lineHeight: 1, textShadow: `2px 2px 0 ${tokens.ink}` }}
        >
          <Sticker name="tree" width={40} />
          Family Gifts
        </Box>
        {items.length > 0 && (
          <Box component="nav" aria-label="Main" sx={{ display: { xs: "none", md: "flex" }, gap: 1, ml: "20px" }}>
            {items.map((item) => {
              const active = isActive(pathname, item.match, item.exclude);
              return (
                <Box
                  key={item.label}
                  component={NextLink}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 44,
                    px: 2,
                    border: "3px solid transparent",
                    borderRadius: "14px",
                    fontWeight: 800,
                    fontSize: 15,
                    textDecoration: "none",
                    color: tokens.cream,
                    ...(active ? { backgroundColor: tokens.yellow, color: tokens.ink, borderColor: tokens.ink, boxShadow: shadows.button } : {}),
                  }}
                >
                  {item.label}
                </Box>
              );
            })}
          </Box>
        )}
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>{right}</Box>
      </Toolbar>
    </AppBar>
  );
}

/** What an unnamed visitor sees where the name chip would be: a link to the welcome screen that brings them back to this page. */
export function PickNameChip() {
  const pathname = usePathname();
  return (
    <Box
      component={NextLink}
      href={`/welcome?next=${encodeURIComponent(pathname)}`}
      sx={{ display: "inline-flex", alignItems: "center", minHeight: 40, px: "14px", border: `3px solid ${tokens.ink}`, borderRadius: "22px", backgroundColor: tokens.cream, color: tokens.ink, fontWeight: 800, fontSize: 14, textDecoration: "none" }}
    >
      Pick your name
    </Box>
  );
}
