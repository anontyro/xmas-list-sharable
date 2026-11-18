import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";

/** What the planner pages show someone with no name yet: they have nothing planned to show. */
export default function PickNameFirst() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>My Planner</Typography>
      <Typography sx={{ mb: 2 }}>Pick a name on someone&apos;s list first, then your gift plans will be kept here.</Typography>
      <AppLink href="/">Go to the family page</AppLink>
    </Container>
  );
}
