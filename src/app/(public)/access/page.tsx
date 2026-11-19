import { redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import AccessPanel from "@/features/authentication/components/AccessPanel";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import { recoveryStatus } from "@/features/authentication/recovery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Save your access · Family Gifts", robots: { index: false, follow: false } };

export default async function AccessPage() {
  const guest = await getGuestIdentity();
  if (!guest) redirect("/welcome?next=/access");
  const { active, createdAt } = await recoveryStatus(guest.guestId);
  return (
    <>
      <Hero title="Save your access" subtitle="Get your planner back on another phone or laptop" tint="sky" back={{ label: "Family", href: "/" }} sticker={{ name: "badge", width: 80, rotate: -6 }} />
      <PageWrap>
        <AccessPanel guestId={guest.guestId} name={guest.displayName} status={{ active, createdAt: createdAt?.toISOString() ?? null }} />
      </PageWrap>
    </>
  );
}
