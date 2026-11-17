import SplitLayout from "@/components/sticker/SplitLayout";
import OwnerSignIn from "@/features/authentication/components/OwnerSignIn";
import RoleSwitch from "@/features/authentication/components/RoleSwitch";
import { listLoginMembers } from "@/features/family/queries";

export const metadata = { title: "Sign in · Family Gifts", robots: { index: false } };
export const dynamic = "force-dynamic";

const visuallyHidden = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" } as const;

export default async function OwnerLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initialName = typeof sp.name === "string" ? sp.name.slice(0, 100) : undefined;
  const initialPin = typeof sp.pin === "string" && /^\d{1,12}$/.test(sp.pin) ? sp.pin : undefined;
  const members = await listLoginMembers();
  return (
    <SplitLayout>
      <RoleSwitch active="owner" />
      <h1 style={visuallyHidden}>Sign in to your list</h1>
      <OwnerSignIn members={members} initialName={initialName} initialPin={initialPin} />
    </SplitLayout>
  );
}
