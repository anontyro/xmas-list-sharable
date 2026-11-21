import Box from "@mui/material/Box";
import MemberAvatar from "@/components/sticker/MemberAvatar";
import Pill from "@/components/sticker/Pill";
import SectionTitle from "@/components/sticker/SectionTitle";
import StickerCard from "@/components/sticker/StickerCard";
import ActionButton from "@/components/ui/ActionButton";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { approveMember, archiveList, deactivateMember } from "@/features/family/actions";
import type { AvatarSticker } from "@/features/family/avatars";
import RenameDialog from "./RenameDialog";
import ResetPinDialog from "./ResetPinDialog";

export type AdminMember = {
  id: string;
  displayName: string;
  avatar: AvatarSticker | null;
  active: boolean;
  hasPin: boolean;
  /** Signed themselves up and waiting for the admin (decision 0026). */
  pending: boolean;
  lists: { id: string; title: string; slug: string; archivedAt: Date | null }[];
};

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** One member: picture, name, status, each open list with its link, and the four admin buttons (screen 11). */
export default function AdminMemberCard({ member: m }: { member: AdminMember }) {
  const open = m.lists.filter((l) => l.archivedAt === null);
  const waiting = m.active && m.pending;
  const status = !m.active ? <Pill>Inactive</Pill> : m.pending ? <Pill tone="yellow">Waiting for approval</Pill> : m.hasPin ? <Pill tone="mint">Active</Pill> : <Pill tone="pink">PIN not set</Pill>;
  return (
    <StickerCard component="article" aria-label={m.displayName} padded sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <MemberAvatar id={m.id} name={m.displayName} avatar={m.avatar} size={48} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start" }}>
          <SectionTitle>{m.displayName}</SectionTitle>
          {status}
        </Box>
      </Box>
      {open.length === 0 && <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700 }}>No open lists.</Box>}
      {open.map((l) => (
        <StickerCard key={l.id} tint="cream" sx={{ p: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
          <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700 }}>
            {l.title}
            <br />
            <Box component="span" sx={{ fontFamily: MONO }}>/l/{l.slug}</Box>
          </Box>
          <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <CopyLinkButton path={`/l/${l.slug}`} what={`${m.displayName}, ${l.title}`} />
            <ActionButton onAction={archiveList.bind(null, l.id)} size="small" variant="ghost" aria-label={`Archive list: ${m.displayName}, ${l.title}`} confirmText="Archive this list? It stays readable but can't be edited.">
              Archive list
            </ActionButton>
          </Box>
        </StickerCard>
      ))}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <ResetPinDialog memberId={m.id} memberName={m.displayName} hasPin={m.hasPin} />
        <RenameDialog memberId={m.id} name={m.displayName} avatar={m.avatar} />
        {waiting && (
          <ActionButton onAction={approveMember.bind(null, m.id)} size="small" variant="contained" aria-label={`Approve ${m.displayName}`}>
            Approve
          </ActionButton>
        )}
        {m.active && (
          <ActionButton onAction={deactivateMember.bind(null, m.id)} size="small" variant="ghost" aria-label={`Deactivate ${m.displayName}`} confirmText="Deactivate this member? They will be signed out and hidden from the family page.">
            Deactivate
          </ActionButton>
        )}
      </Box>
    </StickerCard>
  );
}
