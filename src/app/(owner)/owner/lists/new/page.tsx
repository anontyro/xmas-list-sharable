import { redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import NewListForm from "@/features/wishlists/components/NewListForm";
import { londonYear } from "@/features/wishlists/countdown";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "New list · Family Gifts", robots: { index: false } };

export default async function NewListPage() {
  if (!(await currentOwner())) redirect("/owner/login");
  return (
    <>
      <Hero title="New list" subtitle="Save it as a draft or share it with the family" tint="mint" sticker={{ name: "heartlist", width: 70, rotate: 6 }} />
      <PageWrap>
        <NewListForm year={londonYear(new Date())} />
      </PageWrap>
    </>
  );
}
