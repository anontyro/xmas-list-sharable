import Empty from "@/components/sticker/Empty";
import Box from "@mui/material/Box";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import TwoColumn from "@/components/sticker/TwoColumn";
import LinkButton from "@/components/ui/LinkButton";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import BudgetCard from "@/features/planner/components/BudgetCard";
import ExportMenu from "@/features/planner/components/ExportMenu";
import PickNameFirst from "@/features/planner/components/PickNameFirst";
import RecipientCard from "@/features/planner/components/RecipientCard";
import { SelectionProvider } from "@/features/planner/components/SelectionContext";
import { getPlanner } from "@/features/planner/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Planner · Family Gifts", robots: { index: false, follow: false } };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await getGuestIdentity())) return <PickNameFirst />;

  const sp = await searchParams;
  const occasion = typeof sp.occasion === "string" ? sp.occasion : undefined;
  const year = typeof sp.year === "string" ? Number(sp.year) : undefined;
  const plan = await getPlanner({ occasion, year });
  const title = `${plan.selected.occasion} ${plan.selected.year}`;

  return (
    <>
      <Hero title="My planner" subtitle={`${title} · only you can see this`} tint="mint" sticker={{ name: "coins", width: 88, rotate: -6 }} />
      <PageWrap>
        {plan.periods.length > 1 && (
          <Box component="nav" aria-label="Occasion" sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {plan.periods.map((p) => {
              const current = p.occasion === plan.selected.occasion && p.year === plan.selected.year;
              return (
                <LinkButton key={`${p.occasion}${p.year}`} size="small" variant="contained" color={current ? "yellow" : "inherit"} aria-current={current ? "page" : undefined} href={`/planner?occasion=${encodeURIComponent(p.occasion)}&year=${p.year}`}>
                  {p.occasion} {p.year}
                </LinkButton>
              );
            })}
          </Box>
        )}
        <SelectionProvider>
          <TwoColumn
            main={
              <>
                {plan.groups.length === 0 && (
                  <Empty sticker="checklist">Nothing in your planner yet. Open a family list and tap Interested or Reserve on a gift.</Empty>
                )}
                {plan.groups.map((g) => (
                  <RecipientCard key={g.memberId} group={g} period={plan.selected} />
                ))}
                <ExportMenu plan={plan} />
              </>
            }
            side={<BudgetCard title={`My ${title} plan`} totals={plan.totals} budgetMinor={plan.budgetMinor} period={plan.selected} />}
          />
        </SelectionProvider>
      </PageWrap>
    </>
  );
}
