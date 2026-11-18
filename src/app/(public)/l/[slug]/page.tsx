import Box from "@mui/material/Box";
import SectionTitle from "@/components/sticker/SectionTitle";
import { notFound } from "next/navigation";
import AppLink from "@/components/ui/AppLink";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import RememberList from "@/components/layout/RememberList";
import Hero from "@/components/sticker/Hero";
import Note from "@/components/sticker/Note";
import PageWrap from "@/components/sticker/PageWrap";
import PriorityRibbon from "@/components/sticker/PriorityRibbon";
import StickerCard from "@/components/sticker/StickerCard";
import TwoColumn from "@/components/sticker/TwoColumn";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import PlannerStrip from "@/features/planner/components/PlannerStrip";
import { getPlannerSummary } from "@/features/planner/queries";
import NamePrompt from "@/features/reservations/components/NamePrompt";
import GiftRow from "@/features/wishlists/components/GiftRow";
import ListFilterDialog from "@/features/wishlists/components/ListFilterDialog";
import ListFilters from "@/features/wishlists/components/ListFilters";
import { getListForViewer } from "@/features/wishlists/public-queries";
import { PRIORITIES } from "@/features/wishlists/schemas";
import { filterItems, normaliseMax, parseViewParams, sortItems } from "@/features/wishlists/sort-filter";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };


export default async function ListPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const guest = await getGuestIdentity();
  const list = await getListForViewer((await params).slug, guest?.guestId ?? null);
  if (!list) notFound();
  const dearest = Math.max(0, ...list.items.map((i) => i.priceMinor ?? 0));
  const maxPounds = Math.ceil(dearest / 500) * 5; // the slider's top: the dearest gift rounded up to £5
  const { sort, filters: asked } = parseViewParams(await searchParams);
  const filters = normaliseMax(asked, maxPounds); // a stale or hand-edited price limit shows what it really does
  const visible = filterItems(sortItems(list.items, sort), filters);
  const summary = guest ? await getPlannerSummary({ occasion: list.occasion, year: list.year }) : null; // this list's own year, not the guest's newest
  const canAct = Boolean(guest) && !list.archived;
  const canFilter = list.items.length > 1;
  const rows = (items: typeof visible) => items.map((item) => <GiftRow key={item.id} item={item} canAct={canAct} />);

  return (
    <>
      <RememberList slug={list.slug} />
      <Hero
        title={`${list.memberName}'s ${list.occasion}`}
        subtitle={`${list.year} · ${list.items.length === 1 ? "1 gift" : `${list.items.length} gifts`} · shared list`}
        tint="yellow"
        back={{ label: "Family", href: "/" }}
        sticker={{ name: "tree", width: 84, rotate: 7 }}
      />
      <PageWrap>
        {list.archived && <Note tint="sky" sticker="bookmark"><p>Archived: this list is no longer being updated.</p></Note>}
        {!list.archived && !guest && <NamePrompt slug={list.slug} />}
        {canFilter && (
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            <ListFilterDialog sort={sort} filters={filters} maxPounds={maxPounds} />
          </Box>
        )}
        <TwoColumn
          sideLast
          main={
            list.items.length === 0 ? (
              <StickerCard tint="cream" padded>Nothing on this list yet.</StickerCard>
            ) : visible.length === 0 ? (
              <StickerCard tint="cream" padded>
                No gifts match these filters. <AppLink href={`/l/${list.slug}`}>Clear filters</AppLink>
              </StickerCard>
            ) : sort === "priority" ? (
              // The owner's order, in groups. Another sort has no groups: they would break the order.
              PRIORITIES.map((p) => {
                const group = visible.filter((i) => i.priority === p);
                if (group.length === 0) return null;
                return (
                  <Box key={p} sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <PriorityRibbon priority={p} />
                    {rows(group)}
                  </Box>
                );
              })
            ) : (
              rows(visible)
            )
          }
          side={
            <>
              {canFilter && (
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <StickerCard component="section" padded>
                    <SectionTitle sx={{ mb: "12px" }}>Sort and filter</SectionTitle>
                    <ListFilters sort={sort} filters={filters} maxPounds={maxPounds} />
                  </StickerCard>
                </Box>
              )}
              {summary && <PlannerStrip summary={summary} />}
              <CopyLinkButton path={`/l/${list.slug}`} />
            </>
          }
        />
      </PageWrap>
    </>
  );
}
