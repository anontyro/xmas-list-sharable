import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";
import Icon from "@/components/ui/Icon";
import { getFamilyDashboard } from "@/features/wishlists/public-queries";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function HomePage() {
  const { members } = await getFamilyDashboard();
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
        <Icon name="interface/family_group" size={64} />
        <Typography variant="h3" component="h1">Family Gifts</Typography>
      </Stack>
      {members.length === 0 ? (
        <Typography>No wishlists yet. Once the family admin creates some, they&apos;ll appear here.</Typography>
      ) : (
        <Stack spacing={2}>
          {members.map((m) => (
            <Paper key={m.id} sx={{ p: 2 }}>
              <Typography variant="h6" component="h2">{m.displayName}</Typography>
              <Stack component="ul" sx={{ listStyle: "none", p: 0, m: 0 }} spacing={0.5}>
                {m.lists.map((l) => (
                  <li key={l.slug}>
                    <AppLink href={`/l/${l.slug}`}>{l.title}</AppLink>{" "}
                    <Typography component="span" color="text.secondary">({l.occasion} {l.year})</Typography>
                  </li>
                ))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}
