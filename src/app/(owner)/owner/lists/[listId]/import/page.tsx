import { notFound, redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import ImportWizard from "@/features/imports/components/ImportWizard";
import { getOwnList } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "Paste from Amazon · Family Gifts", robots: { index: false } };

export default async function ImportPage({ params }: { params: Promise<{ listId: string }> }) {
  if (!(await currentOwner())) redirect("/owner/login");
  const list = await getOwnList((await params).listId);
  if (!list) notFound();
  const back = `/owner/lists/${list.id}`;
  if (list.archived) redirect(back); // read-only: nothing can be added
  return (
    <>
      <Hero title="Paste from Amazon" subtitle="Nothing is saved until you say so" tint="sky" back={{ label: "My list", href: back }} sticker={{ name: "box", width: 88, rotate: -6 }} />
      <PageWrap>
        <ImportWizard listId={list.id} backHref={back} addHref={`${back}/add?mode=manual`} />
      </PageWrap>
    </>
  );
}
