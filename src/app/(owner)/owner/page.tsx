import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import ActionButton from "@/components/ui/ActionButton";
import AppLink from "@/components/ui/AppLink";
import { ownerLogout } from "@/features/authentication/owner-login";
import { listOwnLists } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "My lists · Family Gifts", robots: { index: false } };

export default async function OwnerHome() {
  if (!(await currentOwner())) redirect("/owner/login");
  const lists = await listOwnLists();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" component="h1">My lists</Typography>
        <ActionButton onAction={ownerLogout} variant="outlined">Sign out</ActionButton>
      </Stack>
      <Stack spacing={1}>
        {lists.length === 0 && <Typography>You don&apos;t have a list yet. Ask the family admin to create one.</Typography>}
        {lists.map((l) => (
          <Paper key={l.id} sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <AppLink href={`/owner/lists/${l.id}`} variant="subtitle1" underline="hover">{l.title}</AppLink>
              <Typography color="text.secondary">{l.occasion} {l.year}</Typography>
              {l.archived && <Chip label="Archived" size="small" />}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
