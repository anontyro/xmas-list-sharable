import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { OwnerLoginForm } from "@/features/authentication/components/LoginForms";
import { listLoginMembers } from "@/features/family/queries";

export const metadata = { title: "Sign in · Family Gifts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OwnerLoginPage() {
  const members = await listLoginMembers();
  return (
    <Container maxWidth="xs" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>Sign in to your list</Typography>
      <OwnerLoginForm members={members} />
    </Container>
  );
}
