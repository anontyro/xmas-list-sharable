import SplitLayout from "@/components/sticker/SplitLayout";
import RecoverExchange from "@/features/authentication/components/RecoverExchange";

export const metadata = { title: "Recover · Family Gifts", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function RecoverPage() {
  return (
    <SplitLayout>
      <RecoverExchange />
    </SplitLayout>
  );
}
