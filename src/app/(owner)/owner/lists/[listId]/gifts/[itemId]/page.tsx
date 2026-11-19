import { notFound, redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import GiftForm from "@/features/wishlists/components/GiftForm";
import { getOwnList } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "Edit gift · Family Gifts", robots: { index: false } };

export default async function EditGiftPage({ params }: { params: Promise<{ listId: string; itemId: string }> }) {
  if (!(await currentOwner())) redirect("/owner/login");
  const { listId, itemId } = await params;
  const list = await getOwnList(listId);
  const item = list?.items.find((i) => i.id === itemId);
  if (!list || !item) notFound();
  const back = `/owner/lists/${list.id}`;
  if (list.archived) redirect(back);
  return (
    <>
      <Hero title="Edit gift" subtitle="Change anything, then save" tint="yellow" back={{ label: "My list", href: back }} sticker={{ name: "presentgold", width: 80, rotate: 6 }} />
      <PageWrap>
        <GiftForm key={item.id} listId={list.id} item={item} initialMode="manual" backHref={back} />
      </PageWrap>
    </>
  );
}
