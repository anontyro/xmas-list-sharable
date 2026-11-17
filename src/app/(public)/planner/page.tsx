import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppLink from "@/components/ui/AppLink";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import BudgetSheet from "@/features/planner/components/BudgetSheet";
import ExportMenu from "@/features/planner/components/ExportMenu";
import { SelectionProvider } from "@/features/planner/components/SelectionContext";
import PlannerGroup from "@/features/planner/components/PlannerGroup";
import TotalsPanel from "@/features/planner/components/TotalsPanel";
import { getPlanner } from "@/features/planner/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Planner · Family Gifts", robots: { index: false, follow: false } };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await getGuestIdentity())) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>My Planner</Typography>
        <Typography sx={{ mb: 2 }}>Pick a name on someone&apos;s list first, then your gift plans will be kept here.</Typography>
        <AppLink href="/">Go to the family page</AppLink>
      </Container>
    );
  }

  const sp = await searchParams;
  const occasion = typeof sp.occasion === "string" ? sp.occasion : undefined;
  const year = typeof sp.year === "string" ? Number(sp.year) : undefined;
  const plan = await getPlanner({ occasion, year });
  const title = `${plan.selected.occasion} ${plan.selected.year}`;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1">My Planner</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{plan.guestName}, {title}</Typography>
      {plan.periods.length > 1 && (
        <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: "wrap" }} component="nav" aria-label="Occasion">
          {plan.periods.map((p) => (
            <AppLink key={`${p.occasion}${p.year}`} href={`/planner?occasion=${encodeURIComponent(p.occasion)}&year=${p.year}`} sx={{ fontWeight: p === plan.selected ? 700 : 400 }} aria-current={p.occasion === plan.selected.occasion && p.year === plan.selected.year ? "page" : undefined}>
              {p.occasion} {p.year}
            </AppLink>
          ))}
        </Stack>
      )}
      <SelectionProvider>
        <Stack spacing={3}>
          <TotalsPanel title={`My ${title} plan`} totals={plan.totals} budgetMinor={plan.budgetMinor} />
          <div>
            <BudgetSheet
              key={`${title}-${plan.budgetMinor}-${plan.groups.map((g) => g.budgetMinor).join(",")}`}
              occasion={plan.selected.occasion}
              year={plan.selected.year}
              budgetMinor={plan.budgetMinor}
              recipients={plan.groups.map((g) => ({ memberId: g.memberId, name: g.memberName, budgetMinor: g.budgetMinor }))}
            />
          </div>
          <ExportMenu plan={plan} />
          {plan.groups.length === 0 && <Typography>Nothing in your planner yet. Open a family list and tap Interested or Reserve on a gift.</Typography>}
          {plan.groups.map((g) => (
            <PlannerGroup key={g.memberId} group={g} />
          ))}
        </Stack>
      </SelectionProvider>
    </Container>
  );
}
