import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import PublicItemCard from "@/features/wishlists/components/PublicItemCard";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import GuestWelcome from "@/features/reservations/components/GuestWelcome";
import SortFilterBar from "@/features/wishlists/components/SortFilterBar";
import { getListForViewer } from "@/features/wishlists/public-queries";
import { filterItems, parseViewParams, sortItems } from "@/features/wishlists/sort-filter";
import AppLink from "@/components/ui/AppLink";
import RememberList from "@/components/layout/RememberList";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ListPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const guest = await getGuestIdentity();
  const list = await getListForViewer((await params).slug, guest?.guestId ?? null);
  if (!list) notFound();
  const { sort, filters } = parseViewParams(await searchParams);
  const visible = filterItems(sortItems(list.items, sort), filters);
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <RememberList slug={list.slug} />
      <Typography variant="h4" component="h1">{list.memberName}&apos;s wishlist</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{list.title} · {list.occasion} {list.year}</Typography>
      {list.archived && <Alert severity="info" sx={{ mb: 2 }}>Archived: this list is no longer being updated.</Alert>}
      <Stack spacing={2} sx={{ mb: 1 }}>
        <CopyLinkButton path={`/l/${list.slug}`} />
        {!list.archived && <GuestWelcome currentName={guest?.displayName ?? null} />}
      </Stack>
      {list.items.length > 1 && (
        <div style={{ marginTop: 24 }}>
          <SortFilterBar sort={sort} filters={filters} />
        </div>
      )}
      <Stack spacing={2} sx={{ mt: 3 }}>
        {list.items.length === 0 && <Typography>Nothing on this list yet.</Typography>}
        {list.items.length > 0 && visible.length === 0 && (
          <Typography>No gifts match these filters. <AppLink href={`/l/${list.slug}`}>Clear filters</AppLink></Typography>
        )}
        {visible.map((item) => (
          <PublicItemCard key={item.id} item={item} canAct={Boolean(guest) && !list.archived} />
        ))}
      </Stack>
    </Container>
  );
}
