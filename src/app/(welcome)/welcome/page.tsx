import { redirect } from "next/navigation";
import SplitLayout from "@/components/sticker/SplitLayout";
import GuestNameForm from "@/features/authentication/components/GuestNameForm";
import PasteRecoveryLink from "@/features/authentication/components/PasteRecoveryLink";
import RoleSwitch from "@/features/authentication/components/RoleSwitch";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import { safeNext } from "@/features/authentication/safe-next";

export const metadata = { title: "Welcome · Family Gifts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw); // only the app's own pages; anything else is "/"
  if (await getGuestIdentity()) redirect(next); // already has a name: nothing to ask
  return (
    <SplitLayout>
      <RoleSwitch active="guest" next={next} />
      <h1 style={{ margin: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 30, lineHeight: 1.05 }}>Welcome! What should we call you?</h1>
      <GuestNameForm next={next} />
      <PasteRecoveryLink />
    </SplitLayout>
  );
}
