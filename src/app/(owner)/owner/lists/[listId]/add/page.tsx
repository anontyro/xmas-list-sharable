import { notFound, redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import GiftForm from "@/features/wishlists/components/GiftForm";
import { getOwnList } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "Add a gift · Family Gifts", robots: { index: false } };

export default async function AddGiftPage({ params, searchParams }: { params: Promise<{ listId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await currentOwner())) redirect("/owner/login");
  const list = await getOwnList((await params).listId);
  if (!list) notFound();
  const back = `/owner/lists/${list.id}`;
  if (list.archived) redirect(back); // read-only: there is nothing to add to
  const { mode } = await searchParams;
  return (
    <>
      <Hero title="Add a gift" subtitle="Paste a link and we'll fill in what we can" tint="yellow" back={{ label: "My list", href: back }} sticker={{ name: "presentgold", width: 80, rotate: 6 }} />
      <PageWrap>
        <GiftForm listId={list.id} initialMode={mode === "manual" ? "manual" : "link"} backHref={back} ranked={list.ranked} />
      </PageWrap>
    </>
  );
}
