import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/features/authentication/components/LoginForms";
import { currentAdmin } from "@/lib/auth/require";

export const metadata = { title: "Admin sign in · Family Gifts", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <Container maxWidth="xs" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>Admin sign in</Typography>
      <AdminLoginForm />
    </Container>
  );
}
