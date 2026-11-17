import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { OwnerLoginForm } from "@/features/authentication/components/LoginForms";
import { listLoginMembers } from "@/features/family/queries";

export const metadata = { title: "Sign in · Family Gifts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OwnerLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initialName = typeof sp.name === "string" ? sp.name.slice(0, 100) : undefined;
  const initialPin = typeof sp.pin === "string" && /^\d{1,12}$/.test(sp.pin) ? sp.pin : undefined;
  const members = await listLoginMembers();
  return (
    <Container maxWidth="xs" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>Sign in to your list</Typography>
      <OwnerLoginForm members={members} initialName={initialName} initialPin={initialPin} />
    </Container>
  );
}
