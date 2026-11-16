import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound, redirect } from "next/navigation";
import AppLink from "@/components/ui/AppLink";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import ItemForm from "@/features/wishlists/components/ItemForm";
import OwnerItemList from "@/features/wishlists/components/OwnerItemList";
import { getOwnList } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "My list · Family Gifts", robots: { index: false } };

export default async function OwnerListPage({ params }: { params: Promise<{ listId: string }> }) {
  if (!(await currentOwner())) redirect("/owner/login");
  const list = await getOwnList((await params).listId);
  if (!list) notFound();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <AppLink href="/owner" underline="hover">← My lists</AppLink>
      <Typography variant="h4" component="h1" sx={{ my: 2 }}>{list.title}</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 3 }}>
        <Typography color="text.secondary">Share this list:</Typography>
        <CopyLinkButton path={`/l/${list.slug}`} />
      </Stack>
      {list.archived ? (
        <Alert severity="info" sx={{ mb: 3 }}>This list is archived, so it can&apos;t be changed.</Alert>
      ) : (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>Add a gift</Typography>
          <ItemForm listId={list.id} />
        </Paper>
      )}
      <OwnerItemList listId={list.id} items={list.items} readOnly={list.archived} />
    </Container>
  );
}
