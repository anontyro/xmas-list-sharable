import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import PublicItemCard from "@/features/wishlists/components/PublicItemCard";
import { getListBySlug } from "@/features/wishlists/public-queries";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const list = await getListBySlug((await params).slug);
  if (!list) notFound();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1">{list.memberName}&apos;s wishlist</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{list.title} · {list.occasion} {list.year}</Typography>
      {list.archived && <Alert severity="info" sx={{ mb: 2 }}>Archived: this list is no longer being updated.</Alert>}
      <CopyLinkButton path={`/l/${list.slug}`} />
      <Stack spacing={2} sx={{ mt: 3 }}>
        {list.items.length === 0 && <Typography>Nothing on this list yet.</Typography>}
        {list.items.map((item) => (
          <PublicItemCard key={item.id} item={item} />
        ))}
      </Stack>
    </Container>
  );
}
