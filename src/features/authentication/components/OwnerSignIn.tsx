"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { ownerLogin } from "@/features/authentication/owner-login";
import { findMemberByName } from "@/features/authentication/prefill";
import { shadows, tokens } from "@/theme/tokens";

type Props = { members: { id: string; displayName: string }[]; initialName?: string; initialPin?: string };

const ring = { outline: `3px solid ${tokens.ink}`, outlineOffset: 2 };

/**
 * "Whose list?": each member is a radio button drawn as a sticker button (arrow keys move between them), then one PIN field.
 * `initialName` and `initialPin` come from a sign-in link the admin shared. They only fill the form; the person still presses the button.
 */
export default function OwnerSignIn({ members, initialName, initialPin }: Props) {
  const router = useRouter();
  const [memberId, setMemberId] = useState((findMemberByName(members, initialName) ?? members[0])?.id ?? "");
  const [pin, setPin] = useState(initialPin ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  // Take the PIN out of the address bar (history, bookmarks, screenshots) as soon as it has been used.
  useEffect(() => {
    if (initialName || initialPin) window.history.replaceState(null, "", "/owner/login");
  }, [initialName, initialPin]);

  if (members.length === 0) return <Alert severity="info">No one has been added yet. Ask the family admin.</Alert>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await ownerLogin(memberId, pin);
      if (r.ok) router.push("/owner");
      else setError(r.error.message);
    });
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Box component="legend" sx={{ p: 0, mb: "6px", fontWeight: 800, fontSize: 14 }}>Whose list?</Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {members.map((m) => (
            <Box key={m.id} component="label" sx={{ position: "relative", display: "inline-flex", cursor: "pointer" }}>
              <Box
                component="input"
                type="radio"
                name="member"
                value={m.id}
                checked={memberId === m.id}
                onChange={() => setMemberId(m.id)}
                // Visually hidden but still the real, keyboard-operable radio. The sticker button next to it shows the state and the focus.
                sx={{ position: "absolute", opacity: 0, width: 1, height: 1, m: 0, "&:focus-visible": { outline: "none" }, "&:focus-visible + span": ring }}
              />
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 40,
                  px: "12px",
                  border: `3px solid ${tokens.ink}`,
                  borderRadius: "14px",
                  boxShadow: shadows.button,
                  fontFamily: "var(--font-display), sans-serif",
                  fontSize: 15,
                  backgroundColor: memberId === m.id ? tokens.yellow : tokens.white,
                  color: tokens.ink,
                }}
              >
                {m.displayName}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <TextField
        label="Your PIN"
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        required
        autoComplete="current-password"
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
        helperText="6 or more digits. Too many wrong tries pauses sign-in for a few minutes."
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" fullWidth disabled={pending}>Open my list</Button>
      <Box component="p" sx={{ m: 0, textAlign: "center", color: tokens.muted, fontSize: 13, fontWeight: 700 }}>Lost your PIN? Ask the family admin.</Box>
    </Box>
  );
}
