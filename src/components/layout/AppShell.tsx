"use client";

import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import NextLink from "next/link";
import Icon from "@/components/ui/Icon";

export type NavLink = { label: string; href: string };

const FAMILY: NavLink = { label: "Family", href: "/" };

/** Top bar with the Family link plus role-specific links passed by later features. */
export default function AppShell({ links = [], children }: { links?: NavLink[]; children: React.ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const all = [FAMILY, ...links];

  return (
    <>
      <AppBar position="static" color="primary" component="header">
        <Toolbar>
          <Icon name="christmas/christmas_tree" size={32} />
          <Typography variant="h6" component="span" sx={{ ml: 1, flexGrow: 1 }}>
            Family Gifts
          </Typography>
          <Box component="nav" aria-label="Main" sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
            {all.map((l) => (
              <Button key={l.href} color="inherit" component={NextLink} href={l.href}>
                {l.label}
              </Button>
            ))}
          </Box>
          <IconButton
            color="inherit"
            aria-label="Open menu"
            aria-haspopup="true"
            aria-expanded={anchor ? "true" : undefined}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ display: { xs: "inline-flex", sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            {all.map((l) => (
              <MenuItem key={l.href} component={NextLink} href={l.href} onClick={() => setAnchor(null)}>
                {l.label}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="main">{children}</Box>
    </>
  );
}
