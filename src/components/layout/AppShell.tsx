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
import Sticker from "@/components/ui/Sticker";
import SaveAccessDialog from "@/features/authentication/components/SaveAccessDialog";

export type NavLink = { label: string; href: string };

const FAMILY: NavLink = { label: "Family", href: "/" };

/** Top bar with the Family link plus role-specific links passed by later features. */
export default function AppShell({ links = [], guest = false, children }: { links?: NavLink[]; guest?: boolean; children: React.ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const all = [FAMILY, ...links];

  return (
    <>
      <AppBar position="static" color="primary" component="header">
        <Toolbar>
          <Sticker name="tree" width={36} />
          <Typography variant="h6" component="span" sx={{ ml: 1, flexGrow: 1 }}>
            Family Gifts
          </Typography>
          <Box component="nav" aria-label="Main" sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
            {all.map((l) => (
              <Button key={l.href} color="inherit" component={NextLink} href={l.href}>
                {l.label}
              </Button>
            ))}
            {guest && <Button color="inherit" onClick={() => setSaveOpen(true)}>Save access</Button>}
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
            {guest && (
              <MenuItem onClick={() => { setAnchor(null); setSaveOpen(true); }}>Save access</MenuItem>
            )}
          </Menu>
        </Toolbar>
      </AppBar>
      {guest && <SaveAccessDialog open={saveOpen} onClose={() => setSaveOpen(false)} />}
      <Box component="main">{children}</Box>
    </>
  );
}
