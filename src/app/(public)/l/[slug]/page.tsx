import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import PublicItemCard from "@/features/wishlists/components/PublicItemCard";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import GuestWelcome from "@/features/reservations/components/GuestWelcome";
import { getListForViewer } from "@/features/wishlists/public-queries";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const guest = await getGuestIdentity();
  const list = await getListForViewer((await params).slug, guest?.guestId ?? null);
  if (!list) notFound();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1">{list.memberName}&apos;s wishlist</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{list.title} · {list.occasion} {list.year}</Typography>
      {list.archived && <Alert severity="info" sx={{ mb: 2 }}>Archived: this list is no longer being updated.</Alert>}
      <Stack spacing={2} sx={{ mb: 1 }}>
        <CopyLinkButton path={`/l/${list.slug}`} />
        {!list.archived && <GuestWelcome currentName={guest?.displayName ?? null} />}
      </Stack>
      <Stack spacing={2} sx={{ mt: 3 }}>
        {list.items.length === 0 && <Typography>Nothing on this list yet.</Typography>}
        {list.items.map((item) => (
          <PublicItemCard key={item.id} item={item} canAct={Boolean(guest) && !list.archived} />
        ))}
      </Stack>
    </Container>
  );
}
