import Box from "@mui/material/Box";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import Ribbon from "@/components/sticker/Ribbon";
import LinkButton from "@/components/ui/LinkButton";
import StickerCard from "@/components/sticker/StickerCard";
import Pill from "@/components/sticker/Pill";
import Sticker from "@/components/ui/Sticker";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import PlannerStrip from "@/features/planner/components/PlannerStrip";
import { getPlannerSummary } from "@/features/planner/queries";
import MemberCard from "@/features/wishlists/components/MemberCard";
import { daysUntilChristmas, isChristmas, londonYear } from "@/features/wishlists/countdown";
import { listOwnLists } from "@/features/wishlists/owner-queries";
import { getEarlierYears, getFamilyDashboard } from "@/features/wishlists/public-queries";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const gifts = (n: number) => `${n} ${n === 1 ? "gift" : "gifts"}`;

export default async function HomePage() {
  const now = new Date();
  const [{ members }, earlier, guest] = await Promise.all([getFamilyDashboard(), getEarlierYears(), getGuestIdentity()]);
  const drafts = guest?.memberId ? (await listOwnLists()).filter((l) => !l.published && !l.archived) : []; // empty without the editor session
  const year = londonYear(now);
  const christmasList = members.flatMap((m) => m.lists).find((l) => isChristmas(l.occasion) && l.year === year);
  const christmas = Boolean(christmasList);
  const summary = guest ? await getPlannerSummary({ occasion: christmasList?.occasion ?? "Christmas", year }) : null; // this Christmas, not the newest period with entries
  const days = daysUntilChristmas(now);
  const showCountdown = christmas && days !== null;
  const greeting = guest ? `Hi ${guest.displayName}! Pick a list to browse.` : "Pick a list to browse.";

  return (
    <>
      <Hero
        title={christmas ? `Christmas ${year}` : "Family Gifts"}
        subtitle={members.length === 0 ? undefined : greeting}
        tint="yellow"
        aside={
          showCountdown ? (
            <Box sx={{ textAlign: "center", flex: "none" }}>
              <Sticker name="calendar" width={64} />
              <Box component="p" sx={{ m: 0, fontFamily: "var(--font-display), sans-serif", fontSize: 20, lineHeight: 1 }}>
                {days === 0 ? "Today!" : `${days} ${days === 1 ? "day" : "days"}`}
              </Box>
            </Box>
          ) : undefined
        }
      />
      <PageWrap>
        {members.length === 0 ? (
          <StickerCard tint="cream" padded>No wishlists yet. Once the family admin creates some, they&apos;ll appear here.</StickerCard>
        ) : (
          <Box sx={{ display: "grid", gap: "14px", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" } }}>
            {members.flatMap((m) =>
              m.lists.map((l) => ({ m, l, mine: guest?.memberId === m.id })),
            ).sort((a, b) => Number(b.mine) - Number(a.mine)).map(({ m, l, mine }) => (
                <MemberCard
                  key={l.slug}
                  mine={mine}
                  memberId={m.id}
                  name={m.displayName}
                  avatar={m.avatar}
                  subtitle={`${l.occasion} ${l.year} · ${gifts(l.giftCount)}`}
                  href={`/l/${l.slug}`}
                  label={mine ? `Edit your ${l.title} list` : m.lists.length === 1 ? `Open ${m.displayName}'s list` : `Open ${m.displayName}'s ${l.title} list`}
                />
            ))}
          </Box>
        )}
        {drafts.length > 0 && (
          <Box component="section" aria-label="Your drafts" sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Ribbon tone="yellow">Your drafts</Ribbon>
            {drafts.map((l) => (
              <StickerCard key={l.id} component="article" padded sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box component="h3" sx={{ m: 0, fontSize: 18, fontWeight: 800, overflowWrap: "anywhere" }}>{l.title}</Box>
                  <Pill tone="yellow">Draft · only you</Pill>
                </Box>
                <LinkButton href={`/owner/lists/${l.id}`} size="small" variant="contained" aria-label={`Edit draft ${l.title}`}>Edit</LinkButton>
              </StickerCard>
            ))}
          </Box>
        )}
        {summary && <PlannerStrip summary={summary} />}
        {earlier.length > 0 && (
          <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Ribbon tone="sky">Earlier years</Ribbon>
            {earlier.map((g) => (
              <StickerCard key={`${g.occasion}${g.year}`} component="article" padded sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                <Sticker name="bookmark" width={40} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box component="h3" sx={{ m: 0, fontSize: 18, fontWeight: 800 }}>{g.occasion} {g.year}</Box>
                  <Pill tone="mint">Archived · read-only</Pill>
                </Box>
                <LinkButton href={`/earlier/${g.year}`} size="small" color="inherit" variant="contained" aria-label={`View ${g.occasion} ${g.year} lists`}>View lists</LinkButton>
              </StickerCard>
            ))}
          </Box>
        )}
      </PageWrap>
    </>
  );
}
