import { z } from "zod";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import { listLoginMembers } from "@/features/family/queries";
import BudgetForm from "@/features/planner/components/BudgetForm";
import PickNameFirst from "@/features/planner/components/PickNameFirst";
import { getPlanner } from "@/features/planner/queries";
import { minorToPounds } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Budget and notes · Family Gifts", robots: { index: false, follow: false } };

const uuid = z.string().uuid();

export default async function BudgetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await getGuestIdentity())) return <PickNameFirst />;

  const sp = await searchParams;
  const occasion = typeof sp.occasion === "string" ? sp.occasion : undefined;
  const year = typeof sp.year === "string" ? Number(sp.year) : undefined;
  const plan = await getPlanner({ occasion, year });
  const title = `${plan.selected.occasion} ${plan.selected.year}`;
  const back = `/planner?occasion=${encodeURIComponent(plan.selected.occasion)}&year=${plan.selected.year}`;

  // `gift` only counts when it is a real id of an entry in this guest's own planner for this period; anything else is ignored.
  const giftId = typeof sp.gift === "string" && uuid.safeParse(sp.gift).success ? sp.gift : null;
  const found = plan.groups.flatMap((g) => g.entries.map((e) => ({ entry: e, memberName: g.memberName }))).find(({ entry }) => entry.itemId === giftId);

  const budgetByMember = new Map(plan.recipientBudgets.map((b) => [b.memberId, b.budgetMinor]));
  const withEntries = new Set(plan.groups.map((g) => g.memberId));
  const everyone = await listLoginMembers();
  // People shown from the start: anyone with gifts in this planner or a budget already set. The rest can be added.
  const people = everyone.filter((m) => withEntries.has(m.id) || budgetByMember.has(m.id));

  return (
    <>
      <Hero title="Budget & notes" subtitle={`${title} · only you can see this`} tint="pink" back={{ label: "My planner", href: back }} sticker={{ name: "wallet", width: 86, rotate: 6 }} />
      <PageWrap>
        <BudgetForm
          key={`${title}-${giftId}`}
          period={plan.selected}
          periods={plan.periods}
          backHref={back}
          total={minorToPounds(plan.budgetMinor)}
          people={people.map((m) => ({ id: m.id, name: m.displayName, budget: minorToPounds(budgetByMember.get(m.id) ?? null) }))}
          addable={everyone.filter((m) => !people.some((p) => p.id === m.id)).map((m) => ({ id: m.id, name: m.displayName }))}
          gift={
            found
              ? {
                  itemId: found.entry.itemId,
                  title: found.entry.title,
                  forName: found.memberName,
                  state: found.entry.state,
                  listedPriceMinor: found.entry.listedPriceMinor,
                  actualPrice: minorToPounds(found.entry.actualPriceMinor),
                  note: found.entry.note,
                  included: found.entry.included,
                }
              : null
          }
        />
      </PageWrap>
    </>
  );
}
