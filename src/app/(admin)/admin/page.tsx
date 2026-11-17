import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import AppLink from "@/components/ui/AppLink";
import MemberForm from "@/features/family/components/MemberForm";
import { listMembersForAdmin } from "@/features/family/queries";
import { currentAdmin } from "@/lib/auth/require";

export const metadata = { title: "Admin · Family Gifts", robots: { index: false } };

export default async function AdminPage() {
  if (!(await currentAdmin())) redirect("/admin/login");
  const members = await listMembersForAdmin();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Family admin</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <MemberForm />
      </Paper>
      <Typography variant="h6" component="h2" gutterBottom>Members</Typography>
      <Stack spacing={1}>
        {members.length === 0 && <Typography>No members yet. Add the first one above.</Typography>}
        {members.map((m) => (
          <Paper key={m.id} sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <AppLink href={`/admin/members/${m.id}`} variant="subtitle1">
                {m.displayName}
              </AppLink>
              <Stack direction="row" spacing={1}>
                {!m.active && <Chip label="Inactive" size="small" />}
                {!m.hasPin && <Chip label="No PIN yet" size="small" color="warning" />}
              </Stack>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
