"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Note from "@/components/sticker/Note";
import StickerCard from "@/components/sticker/StickerCard";
import TwoColumn from "@/components/sticker/TwoColumn";
import LinkButton from "@/components/ui/LinkButton";
import { formatGBP, parsePoundsToMinor } from "@/lib/money";
import { saveBudgets, setEntryDetails } from "../actions";
import type { Period } from "../schemas";
import EntryDetailsForm, { type EntryValues, type GiftDetails } from "./EntryDetailsForm";

type Person = { id: string; name: string; budget: string };

/** Total and per-person budgets, plus (with a gift chosen) that gift's price paid and private note. "Save changes" saves both; Cancel leaves without saving. */
export default function BudgetForm({ period, periods, backHref, total: initialTotal, people: initialPeople, addable: initialAddable, gift }: {
  period: Period;
  periods: Period[];
  backHref: string;
  total: string;
  people: Person[];
  addable: { id: string; name: string }[];
  gift: GiftDetails | null;
}) {
  const router = useRouter();
  const [total, setTotal] = useState(initialTotal);
  const [people, setPeople] = useState(initialPeople);
  const [addable, setAddable] = useState(initialAddable);
  const [entry, setEntry] = useState<EntryValues>({ actualPrice: gift?.actualPrice ?? "", note: gift?.note ?? "", included: gift?.included ?? true });
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const setBudget = (id: string, budget: string) => setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, budget } : p)));
  const addPerson = (id: string) => {
    const who = addable.find((a) => a.id === id);
    if (!who) return;
    setPeople((ps) => [...ps, { id, name: who.name, budget: "" }]);
    setAddable((as) => as.filter((a) => a.id !== id));
    setMenu(null);
  };

  const totalMinor = parsePoundsToMinor(total);
  const sum = people.reduce((s, p) => s + (parsePoundsToMinor(p.budget) ?? 0), 0);
  const sumNote =
    totalMinor === null || sum === 0 ? null : sum === totalMinor ? `Per-person budgets add up to ${formatGBP(sum)}, your whole budget.` : sum > totalMinor ? `Per-person budgets add up to ${formatGBP(sum)}, which is more than your whole budget.` : null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      // Budgets first, then the gift: the first problem is shown and nothing after it is reported as saved.
      const budgets = await saveBudgets({ ...period, total, recipients: people.map((p) => ({ memberId: p.id, budget: p.budget })) });
      if (!budgets.ok) return setError(budgets.error.message);
      if (gift) {
        const details = await setEntryDetails({ itemId: gift.itemId, note: entry.note, actualPrice: gift.state === "interested" ? "" : entry.actualPrice, included: entry.included });
        if (!details.ok) return setError(details.error.message);
      }
      router.push(backHref);
      router.refresh();
    });
  };

  const budgetCard = (
          <StickerCard component="section" padded aria-label="Your budget" sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Box component="h2" sx={{ m: 0, fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 20 }}>Your budget</Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: "12px" }}>
              <TextField label="Total budget" size="small" value={total} onChange={(e) => setTotal(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
              <TextField
                select
                size="small"
                label="Occasion"
                value={`${period.occasion}|${period.year}`}
                disabled={periods.length < 2}
                // Switching reloads the page for that occasion; edits not yet saved are dropped.
                onChange={(e) => { const [occasion, year] = e.target.value.split("|"); router.push(`/planner/budget?occasion=${encodeURIComponent(occasion)}&year=${year}`); }}
              >
                {periods.map((p) => (
                  <MenuItem key={`${p.occasion}|${p.year}`} value={`${p.occasion}|${p.year}`}>{p.occasion} {p.year}</MenuItem>
                ))}
              </TextField>
            </Box>
            <div role="group" aria-labelledby="budget-people">
              <Box component="p" id="budget-people" sx={{ m: 0, mb: "6px", fontWeight: 800, fontSize: 13 }}>Budget per person (optional)</Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start", width: "100%" }}>
                {people.map((p) => (
                  <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                    <Box component="span" sx={{ flex: 1, fontWeight: 800, overflowWrap: "anywhere" }}>{p.name}</Box>
                    <TextField size="small" value={p.budget} onChange={(e) => setBudget(p.id, e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `Budget for ${p.name}` } }} sx={{ width: 140 }} />
                  </Box>
                ))}
                {addable.length > 0 && (
                  <>
                    <Button variant="ghost" size="small" aria-haspopup="menu" onClick={(e) => setMenu(e.currentTarget)}>+ Add a person</Button>
                    <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
                      {addable.map((a) => (
                        <MenuItem key={a.id} onClick={() => addPerson(a.id)}>{a.name}</MenuItem>
                      ))}
                    </Menu>
                  </>
                )}
              </Box>
            </div>
            {sumNote && <Note tint="mint" sticker="badge"><p>{sumNote}</p></Note>}
          </StickerCard>
  );

  return (
    <Box component="form" onSubmit={save} sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {gift ? <TwoColumn sideLast main={budgetCard} side={<EntryDetailsForm gift={gift} values={entry} onChange={setEntry} />} /> : budgetCard}
      {error && <Note tint="pink" role="alert"><p>{error}</p></Note>}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <Button type="submit" size="large" variant="contained" disabled={pending} sx={{ flex: "1 1 200px" }}>Save changes</Button>
        <LinkButton href={backHref} size="large" variant="ghost" sx={{ flex: "0 1 140px" }}>Cancel</LinkButton>
      </Box>
    </Box>
  );
}
