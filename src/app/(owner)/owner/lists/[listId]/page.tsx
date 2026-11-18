import Box from "@mui/material/Box";
import { notFound, redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import Note from "@/components/sticker/Note";
import PageWrap from "@/components/sticker/PageWrap";
import Ribbon, { type RibbonTone } from "@/components/sticker/Ribbon";
import StickerCard from "@/components/sticker/StickerCard";
import TwoColumn from "@/components/sticker/TwoColumn";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import LinkButton from "@/components/ui/LinkButton";
import OwnerGiftRow from "@/features/wishlists/components/OwnerGiftRow";
import { getOwnList } from "@/features/wishlists/owner-queries";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/features/wishlists/schemas";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "My list · Family Gifts", robots: { index: false } };

const RIBBON: Record<Priority, { tone: RibbonTone; star: boolean }> = {
  most_wanted: { tone: "red", star: true },
  would_love: { tone: "green", star: false },
  nice_to_have: { tone: "sky", star: false },
};
const heading = { m: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 20 } as const;

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
              <StickerCard tint="cream" padded>No gifts yet.{!list.archived && " Add your first one with + Add a gift."}</StickerCard>
            ) : (
              PRIORITIES.map((p) => {
                const group = list.items.filter((i) => i.priority === p);
                if (group.length === 0) return null;
                return (
                  <Box key={p} sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <Box component="h2" sx={{ m: 0 }}>
                      <Ribbon tone={RIBBON[p].tone}>
                        {RIBBON[p].star && <span aria-hidden="true">★ </span>}
                        {PRIORITY_LABELS[p].toUpperCase()}
                      </Ribbon>
                    </Box>
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
                <Box component="h2" sx={heading}>Share your list</Box>
                <StickerCard tint="cream" sx={{ p: "10px 12px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>/l/{list.slug}</StickerCard>
                <CopyLinkButton path={`/l/${list.slug}`} />
                <Box component="p" sx={{ m: 0, fontSize: 13, fontWeight: 700, color: "text.secondary" }}>Anyone with this link can see your list, so only send it to family.</Box>
              </StickerCard>
              {!list.archived && (
                <StickerCard component="section" padded aria-label="Add gifts" sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Box component="h2" sx={heading}>Add gifts</Box>
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
