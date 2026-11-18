import { redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import StickerCard from "@/components/sticker/StickerCard";
import ChangePinForm from "@/features/authentication/components/ChangePinForm";
import { currentOwner } from "@/lib/auth/require";

export const metadata = { title: "Change my PIN · Family Gifts", robots: { index: false } };

export default async function OwnerPinPage() {
  if (!(await currentOwner())) redirect("/owner/login");
  return (
    <>
      <Hero title="Change my PIN" subtitle="Your PIN opens your list" tint="pink" back={{ label: "My lists", href: "/owner" }} sticker={{ name: "badge", width: 80, rotate: -6 }} />
      <PageWrap>
        <StickerCard padded sx={{ maxWidth: 520 }}>
          <ChangePinForm />
        </StickerCard>
      </PageWrap>
    </>
  );
}
