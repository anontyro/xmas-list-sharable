import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import ActionButton from "@/components/ui/ActionButton";
import AppLink from "@/components/ui/AppLink";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { archiveList, deactivateMember, restoreList } from "@/features/family/actions";
import ListForm from "@/features/family/components/ListForm";
import MemberForm from "@/features/family/components/MemberForm";
import PinResetForm from "@/features/family/components/PinResetForm";
import { getMemberForAdmin, listListsForAdmin } from "@/features/family/queries";
import { currentAdmin } from "@/lib/auth/require";

export const metadata = { title: "Member · Family Gifts", robots: { index: false } };

export default async function MemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  if (!(await currentAdmin())) redirect("/admin/login");
  const { memberId } = await params;
  if (!z.string().uuid().safeParse(memberId).success) notFound();
  const member = await getMemberForAdmin(memberId);
  if (!member) notFound();
  const lists = await listListsForAdmin(memberId);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <AppLink href="/admin">← All members</AppLink>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", my: 2 }}>
        <Typography variant="h4" component="h1">{member.displayName}</Typography>
        {!member.active && <Chip label="Inactive" />}
      </Stack>

      <Stack spacing={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>Name</Typography>
          <MemberForm memberId={member.id} initialName={member.displayName} />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>Owner PIN</Typography>
          <PinResetForm memberId={member.id} hasPin={member.hasPin} />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>Wishlists</Typography>
          <Stack spacing={2}>
            {lists.length === 0 && <Typography>No lists yet.</Typography>}
            {lists.map((l) => (
              <Stack key={l.id} spacing={1}>
                <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="subtitle1">{l.title}</Typography>
                  <Typography color="text.secondary">{l.occasion} {l.year}</Typography>
                  {l.archivedAt && <Chip label="Archived" size="small" />}
                </Stack>
                <AppLink href={`/l/${l.slug}`}>{`/l/${l.slug}`}</AppLink>
                <Stack direction="row" spacing={1}>
                  <CopyLinkButton path={`/l/${l.slug}`} />
                  {l.archivedAt ? (
                    <ActionButton onAction={restoreList.bind(null, l.id)} variant="outlined" size="small">Restore</ActionButton>
                  ) : (
                    <ActionButton onAction={archiveList.bind(null, l.id)} variant="outlined" size="small" confirmText="Archive this list? It stays readable but can't be edited.">Archive</ActionButton>
                  )}
                </Stack>
              </Stack>
            ))}
            <ListForm memberId={member.id} year={new Date().getFullYear()} />
          </Stack>
        </Paper>

        {member.active && (
          <ActionButton onAction={deactivateMember.bind(null, member.id)} color="error" variant="outlined" confirmText="Deactivate this member? They will be signed out and hidden from the family page.">
            Deactivate member
          </ActionButton>
        )}
      </Stack>
    </Container>
  );
}
