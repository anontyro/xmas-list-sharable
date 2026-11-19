import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";

export default function EarlierNotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>We couldn&apos;t find that year</Typography>
      <Typography sx={{ mb: 2 }}>There are no archived lists for that year.</Typography>
      <AppLink href="/">Back to the family page</AppLink>
    </Container>
  );
}
