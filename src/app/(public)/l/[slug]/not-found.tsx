import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";

export default function ListNotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>We couldn&apos;t find that list</Typography>
      <Typography sx={{ mb: 2 }}>The link may be wrong or the list may have been removed.</Typography>
      <AppLink href="/">Back to the family page</AppLink>
    </Container>
  );
}
