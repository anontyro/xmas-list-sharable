import Empty from "@/components/sticker/Empty";
import Box from "@mui/material/Box";
import SectionTitle from "@/components/sticker/SectionTitle";
import { notFound, redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import Note from "@/components/sticker/Note";
import PageWrap from "@/components/sticker/PageWrap";
import PriorityRibbon from "@/components/sticker/PriorityRibbon";
import StickerCard from "@/components/sticker/StickerCard";
import TwoColumn from "@/components/sticker/TwoColumn";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import LinkButton from "@/components/ui/LinkButton";
import OwnerGiftRow from "@/features/wishlists/components/OwnerGiftRow";
import { getOwnList } from "@/features/wishlists/owner-queries";
import { PRIORITIES } from "@/features/wishlists/schemas";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "My list · Family Gifts", robots: { index: false } };


export default async function OwnerListPage({ params }: { params: Promise<{ listId: string }> }) {
  if (!(await currentOwner())) redirect("/owner/login");
  const list = await getOwnList((await params).listId);
  if (!list) notFound();
  const base = `/owner/lists/${list.id}`;

  return (
    <>
      <Hero
        title={`My ${list.occasion} list`}
        subtitle={`${list.year} · ${list.items.length === 1 ? "1 gift" : `${list.items.length} gifts`} · only you can edit`}
        tint="mint"
        sticker={{ name: "gifttag", width: 62, rotate: 8 }}
      />
      <PageWrap>
        {list.archived && <Note tint="sky" sticker="bookmark"><p>This list is archived, so it can&apos;t be changed.</p></Note>}
        <TwoColumn
          sideLast
          main={
            list.items.length === 0 ? (
              <Empty sticker="presentgold">No gifts yet.{!list.archived && " Add your first one with + Add a gift."}</Empty>
            ) : (
              PRIORITIES.map((p) => {
                const group = list.items.filter((i) => i.priority === p);
                if (group.length === 0) return null;
                return (
                  <Box key={p} sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <PriorityRibbon priority={p} />
                    {group.map((item, index) => (
                      <OwnerGiftRow key={item.id} listId={list.id} item={item} isFirst={index === 0} isLast={index === group.length - 1} readOnly={list.archived} />
                    ))}
                  </Box>
                );
              })
            )
          }
          side={
            <>
              <StickerCard component="section" padded aria-label="Share your list" sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionTitle>Share your list</SectionTitle>
                <StickerCard tint="cream" sx={{ p: "10px 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>/l/{list.slug}</StickerCard>
                <CopyLinkButton path={`/l/${list.slug}`} />
                <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700, color: "text.secondary" }}>Anyone with this link can see your list, so only send it to family.</Box>
              </StickerCard>
              {!list.archived && (
                <StickerCard component="section" padded aria-label="Add gifts" sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <SectionTitle>Add gifts</SectionTitle>
                  <LinkButton href={`${base}/add?mode=manual`} variant="contained">+ Add a gift</LinkButton>
                  <LinkButton href={`${base}/add?mode=link`} variant="contained" color="yellow">Add from a web link</LinkButton>
                  <LinkButton href={`${base}/import`} variant="contained" color="sky">Paste Amazon wishlist</LinkButton>
                </StickerCard>
              )}
              <Note tint="mint" sticker="sparkles"><p>The surprise is safe. You never see who has reserved or bought anything.</p></Note>
            </>
          }
        />
      </PageWrap>
    </>
  );
}
