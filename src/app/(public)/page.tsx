import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function HomePage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1">
        Family Gifts
      </Typography>
    </Container>
  );
}
