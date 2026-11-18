import Empty from "@/components/sticker/Empty";
import Box from "@mui/material/Box";
import { redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import SectionTitle from "@/components/sticker/SectionTitle";
import StickerCard from "@/components/sticker/StickerCard";
import Pill from "@/components/sticker/Pill";
import ActionButton from "@/components/ui/ActionButton";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { archiveList, restoreList } from "@/features/family/actions";
import { listAllListsForAdmin } from "@/features/family/queries";
import { currentAdmin } from "@/lib/auth/require";

export const metadata = { title: "Lists · Admin · Family Gifts", robots: { index: false } };

export default async function AdminListsPage() {
  if (!(await currentAdmin())) redirect("/admin/login");
  const lists = await listAllListsForAdmin();
  const years = [...new Set(lists.map((l) => l.year))]; // already newest first
  return (
    <>
      <Hero title="Lists" subtitle="Every list, with its private link." tint="sky" sticker={{ name: "bookmark", width: 64, rotate: 6 }} />
      <PageWrap>
        {lists.length === 0 && <Empty sticker="heartlist">No lists yet. Create one on the Members page.</Empty>}
        {years.map((year) => (
          <Box key={year} component="section" aria-label={String(year)} sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <SectionTitle>{year}</SectionTitle>
            {lists.filter((l) => l.year === year).map((l) => {
              const who = `${l.memberName}, ${l.title}`;
              return (
                <StickerCard key={l.id} component="article" aria-label={who} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <Box>
                    <Box component="p" sx={{ m: 0, fontWeight: 800 }}>{l.memberName} · {l.title} {l.archivedAt && <Pill>Archived</Pill>}</Box>
                    <Box component="span" sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, fontWeight: 700 }}>/l/{l.slug}</Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <CopyLinkButton path={`/l/${l.slug}`} what={who} />
                    {l.archivedAt ? (
                      <ActionButton onAction={restoreList.bind(null, l.id)} size="small" variant="ghost" aria-label={`Restore: ${who}`}>Restore</ActionButton>
                    ) : (
                      <ActionButton onAction={archiveList.bind(null, l.id)} size="small" variant="ghost" aria-label={`Archive: ${who}`} confirmText="Archive this list? It stays readable but can't be edited.">Archive</ActionButton>
                    )}
                  </Box>
                </StickerCard>
              );
            })}
          </Box>
        ))}
      </PageWrap>
    </>
  );
}
