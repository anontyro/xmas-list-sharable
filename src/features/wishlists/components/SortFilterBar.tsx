"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { parsePoundsToMinor } from "@/lib/money";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "../schemas";
import { NO_FILTERS, toSearchParams, type Filters, type SortKey } from "../sort-filter";

const SORT_LABELS: Record<SortKey, string> = {
  priority: "Owner's order (priority)",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  newest: "Recently added",
};

const pounds = (minor: number | null) => (minor === null ? "" : (minor / 100).toFixed(2));

/** Sort and filter controls. The view lives in the URL, so a copied link shows the same list; nothing is saved. */
export default function SortFilterBar({ sort, filters }: { sort: SortKey; filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [min, setMin] = useState(pounds(filters.minMinor));
  const [max, setMax] = useState(pounds(filters.maxMinor));
  const active = sort !== "priority" || JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  const go = (nextSort: SortKey, next: Filters) => {
    const q = toSearchParams(nextSort, next).toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const commitPrices = () => go(sort, { ...filters, minMinor: min ? parsePoundsToMinor(min) : null, maxMinor: max ? parsePoundsToMinor(max) : null });
  const togglePriority = (p: Priority) =>
    go(sort, { ...filters, priorities: filters.priorities.includes(p) ? filters.priorities.filter((x) => x !== p) : [...filters.priorities, p] });

  return (
    <Accordion defaultExpanded={active} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="sort-filter-panel" id="sort-filter-header">
        Sort and filter{active ? " (on)" : ""}
      </AccordionSummary>
      <AccordionDetails id="sort-filter-panel">
        <Stack spacing={2} component="form" onSubmit={(e) => { e.preventDefault(); commitPrices(); }}>
          <TextField select size="small" label="Sort by" value={sort} onChange={(e) => go(e.target.value as SortKey, filters)}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <MenuItem key={k} value={k}>{SORT_LABELS[k]}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", columnGap: 2 }} role="group" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <FormControlLabel key={p} label={PRIORITY_LABELS[p]} control={<Checkbox checked={filters.priorities.includes(p)} onChange={() => togglePriority(p)} />} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="From £" value={min} onChange={(e) => setMin(e.target.value)} onBlur={commitPrices} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
            <TextField size="small" label="To £" value={max} onChange={(e) => setMax(e.target.value)} onBlur={commitPrices} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
          </Stack>
          <FormControlLabel
            label="Only gifts nobody has reserved"
            control={<Checkbox checked={filters.availableOnly} onChange={(e) => go(sort, { ...filters, availableOnly: e.target.checked })} />}
          />
          {active && <Button onClick={() => { setMin(""); setMax(""); router.replace(pathname, { scroll: false }); }}>Clear</Button>}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
