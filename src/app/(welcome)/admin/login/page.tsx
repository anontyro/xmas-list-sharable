import { redirect } from "next/navigation";
import SplitLayout from "@/components/sticker/SplitLayout";
import AdminSignIn from "@/features/authentication/components/AdminSignIn";
import { currentAdmin } from "@/lib/auth/require";

export const metadata = { title: "Admin sign in · Family Gifts", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <SplitLayout>
      <h1 style={{ margin: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 30, lineHeight: 1.05 }}>Admin sign in</h1>
      <AdminSignIn />
    </SplitLayout>
  );
}
