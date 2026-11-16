"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { saveBudgets } from "@/features/planner/actions";
import { minorToPounds } from "@/lib/money";

export default function BudgetSheet({ occasion, year, budgetMinor, recipients }: {
  occasion: string; year: number; budgetMinor: number | null; recipients: { memberId: string; name: string; budgetMinor: number | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(minorToPounds(budgetMinor));
  const [each, setEach] = useState(() => Object.fromEntries(recipients.map((r) => [r.memberId, minorToPounds(r.budgetMinor)])));
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const r = await saveBudgets({ occasion, year, total, recipients: recipients.map((x) => ({ memberId: x.memberId, budget: each[x.memberId] ?? "" })) });
      if (!r.ok) return setError(r.error.message);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>Set budgets</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <form onSubmit={save}>
          <DialogTitle>Budgets for {occasion} {year}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Total budget (£)" size="small" value={total} onChange={(e) => setTotal(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
              {recipients.map((r) => (
                <TextField key={r.memberId} label={`${r.name} (£, optional)`} size="small" value={each[r.memberId] ?? ""} onChange={(e) => setEach({ ...each, [r.memberId]: e.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
              ))}
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={pending}>Save budgets</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
