import Box from "@mui/material/Box";
import { notFound } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import Ribbon from "@/components/sticker/Ribbon";
import MemberCard from "@/features/wishlists/components/MemberCard";
import { getEarlierYears } from "@/features/wishlists/public-queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Earlier years · Family Gifts", robots: { index: false, follow: false } };

/** One past year's archived lists, read-only. An unknown year is the same friendly not-found page as an unknown list. */
export default async function EarlierYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const groups = (await getEarlierYears()).filter((g) => String(g.year) === year);
  if (groups.length === 0) notFound();
  return (
    <>
      <Hero title={year} subtitle="Archived lists, read-only" tint="sky" back={{ label: "Family", href: "/" }} sticker={{ name: "bookmark", width: 56 }} />
      <PageWrap>
        {groups.map((g) => (
          <Box key={g.occasion} sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Ribbon tone="sky">{g.occasion} {g.year}</Ribbon>
            <Box sx={{ display: "grid", gap: "14px", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" } }}>
              {g.lists.map((l) => (
                <MemberCard key={l.slug} memberId={l.memberId} name={l.memberName} avatar={l.avatar} subtitle={`${l.title} · ${l.giftCount === 1 ? "1 gift" : `${l.giftCount} gifts`}`} href={`/l/${l.slug}`} label={`Open ${l.memberName}'s ${l.title} list`} archived />
              ))}
            </Box>
          </Box>
        ))}
      </PageWrap>
    </>
  );
}
