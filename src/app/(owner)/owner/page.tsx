import Box from "@mui/material/Box";
import SectionTitle from "@/components/sticker/SectionTitle";
import { redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import Pill from "@/components/sticker/Pill";
import StickerCard from "@/components/sticker/StickerCard";
import LinkButton from "@/components/ui/LinkButton";
import { listOwnLists } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "My lists · Family Gifts", robots: { index: false } };

/** All of the owner's lists, archived ones included, as cards. */
export default async function OwnerHome() {
  if (!(await currentOwner())) redirect("/owner/login");
  const lists = await listOwnLists();
  return (
    <>
      <Hero title="My lists" subtitle="Pick a list to edit" tint="mint" sticker={{ name: "heartlist", width: 70, rotate: 6 }} />
      <PageWrap>
        {lists.length === 0 ? (
          <StickerCard tint="cream" padded>You don&apos;t have a list yet. Ask the family admin to create one.</StickerCard>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: "14px", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" } }}>
            {lists.map((l) => (
              <Box component="li" key={l.id}>
                <StickerCard component="article" padded sx={{ display: "flex", alignItems: "center", gap: "12px", height: "100%" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <SectionTitle sx={{ overflowWrap: "anywhere" }}>{l.title}</SectionTitle>
                    <Box component="p" sx={{ m: 0, fontWeight: 800, fontSize: 14, color: "text.secondary" }}>{l.occasion} {l.year}</Box>
                    {l.archived && <Pill tone="mint">Archived · read-only</Pill>}
                  </Box>
                  <LinkButton href={`/owner/lists/${l.id}`} size="small" variant="contained" aria-label={`Open ${l.title}`}>Open</LinkButton>
                </StickerCard>
              </Box>
            ))}
          </Box>
        )}
      </PageWrap>
    </>
  );
}
