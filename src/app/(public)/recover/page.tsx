import Container from "@mui/material/Container";
import RecoverExchange from "@/features/authentication/components/RecoverExchange";

export const metadata = { title: "Recover · Family Gifts", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function RecoverPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <RecoverExchange />
    </Container>
  );
}
