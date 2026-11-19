import Box from "@mui/material/Box";
import SectionTitle from "@/components/sticker/SectionTitle";
import MemberAvatar from "@/components/sticker/MemberAvatar";
import Pill from "@/components/sticker/Pill";
import LinkButton from "@/components/ui/LinkButton";
import StickerCard from "@/components/sticker/StickerCard";
import type { AvatarSticker } from "@/features/family/avatars";

type Props = {
  memberId: string;
  name: string;
  avatar: AvatarSticker | null;
  /** "Christmas 2026 · 5 gifts" */
  subtitle: string;
  href: string;
  /** The button's accessible name: "Open Sarah's list". */
  label: string;
  archived?: boolean;
};

/** One list on the family page: avatar, name, what it is, and an Open button. */
export default function MemberCard({ memberId, name, avatar, subtitle, href, label, archived }: Props) {
  return (
    <StickerCard component="article" padded sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <MemberAvatar id={memberId} name={name} avatar={avatar} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <SectionTitle sx={{ overflowWrap: "anywhere" }}>{name}</SectionTitle>
        <Box component="p" sx={{ m: 0, fontWeight: 800, fontSize: 14, color: "text.secondary" }}>{subtitle}</Box>
        {archived && <Pill tone="mint">Archived · read-only</Pill>}
      </Box>
      <LinkButton href={href} size="small" color={archived ? "inherit" : "primary"} variant="contained" aria-label={label}>Open</LinkButton>
    </StickerCard>
  );
}
