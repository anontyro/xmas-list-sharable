"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "../schemas";
import { NO_FILTERS, toSearchParams, type Filters, type SortKey } from "../sort-filter";

export const SORT_LABELS: Record<SortKey, string> = {
  priority: "Priority",
  price_asc: "Price, low to high",
  price_desc: "Price, high to low",
  newest: "Recently added",
};

export const isFiltered = (sort: SortKey, filters: Filters) => sort !== "priority" || JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

/** The view lives in the URL, so a copied link shows the same list; nothing is saved. `go` replaces it. */
export function useViewNav() {
  const router = useRouter();
  const pathname = usePathname();
  return (sort: SortKey, filters: Filters) => {
    const q = toSearchParams(sort, filters).toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
}

/** A toggle button: the state is in `aria-pressed` and the filled look, never colour alone. */
export function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button size="small" variant="contained" color={on ? "yellow" : "inherit"} aria-pressed={on} onClick={onClick}>
      {children}
    </Button>
  );
}

const Label = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <Box component="p" id={id} sx={{ m: 0, mb: "6px", fontWeight: 800, fontSize: 13 }}>{children}</Box>
);

/** The sort and filter controls, used in the desktop sidebar and in the phone dialog. `maxPounds` is the dearest gift rounded up to £5 (0 = nothing is priced). */
export default function ListFilters({ sort, filters, maxPounds }: { sort: SortKey; filters: Filters; maxPounds: number }) {
  const go = useViewNav();
  const pounds = filters.maxMinor === null ? maxPounds : Math.min(maxPounds, Math.round(filters.maxMinor / 100));
  // Follows the URL when it changes elsewhere (clear, a chip) while dragging or arrow keys keep their own value, so focus stays on the slider.
  const [value, setValue] = useState(pounds);
  const [seen, setSeen] = useState(pounds);
  if (pounds !== seen) {
    setSeen(pounds);
    setValue(pounds);
  }
  const togglePriority = (p: Priority | null) => go(sort, { ...filters, priorities: p === null || (filters.priorities.length === 1 && filters.priorities[0] === p) ? [] : [p] });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div role="group" aria-labelledby="f-sort">
        <Label id="f-sort">Sort by</Label>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <Choice key={k} on={sort === k} onClick={() => go(k, filters)}>{SORT_LABELS[k]}</Choice>
          ))}
        </Box>
      </div>
      <div role="group" aria-labelledby="f-priority">
        <Label id="f-priority">Priority</Label>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <Choice on={filters.priorities.length === 0} onClick={() => togglePriority(null)}>All</Choice>
          {PRIORITIES.map((p) => (
            <Choice key={p} on={filters.priorities.length === 1 && filters.priorities[0] === p} onClick={() => togglePriority(p)}>{PRIORITY_LABELS[p]}</Choice>
          ))}
        </Box>
      </div>
      {maxPounds > 0 && (
        <div>
          <Label id="f-price">{value >= maxPounds ? "Any price" : `Up to £${value}`}</Label>
          <Slider
            aria-labelledby="f-price"
            min={0}
            max={maxPounds}
            step={1}
            value={value}
            onChange={(_, v) => setValue(v as number)}
            valueLabelDisplay="off"
            getAriaValueText={(v) => (v >= maxPounds ? "Any price" : `Up to £${v}`)}
            onChangeCommitted={(_, v) => go(sort, { ...filters, maxMinor: (v as number) >= maxPounds ? null : (v as number) * 100 })}
          />
        </div>
      )}
      <div role="group" aria-labelledby="f-avail">
        <Label id="f-avail">Availability</Label>
        <Box sx={{ display: "flex", gap: "8px" }}>
          <Choice on={!filters.availableOnly} onClick={() => go(sort, { ...filters, availableOnly: false })}>All</Choice>
          <Choice on={filters.availableOnly} onClick={() => go(sort, { ...filters, availableOnly: true })}>Available only</Choice>
        </Box>
      </div>
      {isFiltered(sort, filters) && <Button variant="ghost" size="small" onClick={() => go("priority", NO_FILTERS)}>Clear filters</Button>}
    </Box>
  );
}
