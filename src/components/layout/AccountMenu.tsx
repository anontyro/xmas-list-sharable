"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import NextLink from "next/link";
import { tintFor, TINT_COLOR } from "@/components/sticker/tint";
import { ownerLogout } from "@/features/authentication/owner-login";
import { signOutGuest } from "@/features/authentication/guest-actions";
import { recoveryLinkStatus } from "@/features/authentication/recovery-actions";
import { tokens } from "@/theme/tokens";
import ChangeNameDialog from "./ChangeNameDialog";

type Props = { kind: "guest" | "owner"; id: string; name: string; myListHref?: string };
type Dialogs = "name" | "confirm" | null;

const dashed = { my: "4px", borderStyle: "dashed", borderColor: tokens.ink, borderBottomWidth: 2, opacity: 1 } as const;

/** The name chip in the top bar and its menu (screen 12). Guests: name, recovery link, planner, owner sign-in, sign out. Owners: their list, all lists, sign out. */
export default function AccountMenu({ kind, id, name, myListHref = "/owner" }: Props) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [, start] = useTransition();
  const close = () => setAnchor(null);
  const open = (d: Dialogs) => () => {
    close();
    setDialog(d);
  };

  const finishGuestSignOut = async () => {
    await signOutGuest();
    setDialog(null);
    router.push("/");
    router.refresh();
  };

  // With a recovery link the guest can always get back, so sign out at once; without one, ask first.
  const signOutGuestDevice = () => {
    close();
    start(async () => {
      const status = await recoveryLinkStatus();
      if (status.ok && status.data.active) await finishGuestSignOut();
      else setDialog("confirm");
    });
  };

  const signOutOwner = () => {
    close();
    start(async () => {
      await ownerLogout();
      router.push("/owner/login");
      router.refresh();
    });
  };

  const initial = (Array.from(name.trim())[0] ?? "?").toUpperCase();
  const item = { onClick: close };

  return (
    <>
      <ButtonBase
        aria-haspopup="menu"
        aria-expanded={anchor ? "true" : "false"}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ display: "inline-flex", alignItems: "center", gap: 1, minHeight: 40, pl: "6px", pr: "12px", border: `3px solid ${tokens.ink}`, borderRadius: "22px", backgroundColor: tokens.cream, color: tokens.ink, fontFamily: "inherit", fontWeight: 800, fontSize: 14, ...(anchor ? { boxShadow: `0 3px 0 ${tokens.ink}` } : {}) }}
      >
        <Box component="span" aria-hidden="true" sx={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${tokens.ink}`, borderRadius: "50%", fontFamily: "var(--font-display), sans-serif", fontSize: 14, backgroundColor: TINT_COLOR[tintFor(id)] }}>{initial}</Box>
        <Box component="span" title={name} sx={{ maxWidth: { xs: 110, md: 220 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</Box>
        <span aria-hidden="true">{anchor ? "▴" : "▾"}</span>
      </ButtonBase>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} slotProps={{ paper: { sx: { width: 290, mt: 1 } }, list: { "aria-label": "Account" } }}>
        <li role="presentation" style={{ padding: "6px 10px 6px", listStyle: "none" }}>
          <Box component="p" sx={{ m: 0, fontWeight: 800, fontSize: 17, lineHeight: 1.2, overflowWrap: "anywhere" }}>{name}</Box>
          <Box component="p" sx={{ m: 0, color: tokens.muted, fontSize: 13, fontWeight: 700 }}>{kind === "guest" ? "Shopping on this device" : "List owner"}</Box>
        </li>
        <Divider component="li" sx={dashed} />
        {kind === "guest" && <MenuItem onClick={open("name")}>Change my name</MenuItem>}
        {kind === "guest" && <MenuItem component={NextLink} href="/access" {...item} sx={{ backgroundColor: tokens.sky, "&:hover": { backgroundColor: tokens.sky } }}>Save access (recovery link)</MenuItem>}
        {kind === "guest" && <MenuItem component={NextLink} href="/planner" {...item}>My planner</MenuItem>}
        {kind === "guest" && <MenuItem component={NextLink} href="/owner/login" {...item}>I own a list (PIN)</MenuItem>}
        {kind === "owner" && <MenuItem component={NextLink} href={myListHref} {...item}>My list</MenuItem>}
        {kind === "owner" && <MenuItem component={NextLink} href="/owner" {...item}>All my lists</MenuItem>}
        <Divider component="li" sx={dashed} />
        <MenuItem onClick={kind === "guest" ? signOutGuestDevice : signOutOwner} sx={{ color: tokens.danger }}>
          {kind === "guest" ? "Sign out of this device" : "Sign out"}
        </MenuItem>
        {kind === "guest" && (
          <li role="presentation" style={{ listStyle: "none", padding: "0 10px 6px" }}>
            <Box component="p" sx={{ m: 0, color: tokens.muted, fontSize: 13, fontWeight: 700 }}>You&apos;ll need your recovery link to get back in.</Box>
          </li>
        )}
      </Menu>

      {kind === "guest" && <ChangeNameDialog open={dialog === "name"} currentName={name} onClose={() => setDialog(null)} />}
      {kind === "guest" && (
        <Dialog open={dialog === "confirm"} onClose={() => setDialog(null)} aria-labelledby="confirm-signout-title">
          <DialogTitle id="confirm-signout-title">Sign out without a recovery link?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You may not be able to get back in, and your reservations and planner would be lost to you. Make a recovery link first with Save access.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="contained" color="primary" onClick={() => start(finishGuestSignOut)}>Sign out</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
