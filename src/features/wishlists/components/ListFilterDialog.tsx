"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { Filters, SortKey } from "../sort-filter";
import Choice from "@/components/sticker/Choice";
import ListFilters, { sortLabel, useViewNav } from "./ListFilters";

const QUICK_MAX_MINOR = 2500;

/** Phones: a row of chips for the common cases and a "More filters" button that opens every control in a dialog. */
export default function ListFilterDialog({ sort, filters, maxPounds, ranked = true }: { sort: SortKey; filters: Filters; maxPounds: number; ranked?: boolean }) {
  const [open, setOpen] = useState(false);
  const go = useViewNav();
  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <Choice on={sort !== "priority"} onClick={() => setOpen(true)}>Sort: {sortLabel(sort, ranked)}</Choice>
        <Choice on={filters.availableOnly} onClick={() => go(sort, { ...filters, availableOnly: !filters.availableOnly })}>Available only</Choice>
        {maxPounds * 100 > QUICK_MAX_MINOR && (
          <Choice on={filters.maxMinor === QUICK_MAX_MINOR} onClick={() => go(sort, { ...filters, maxMinor: filters.maxMinor === QUICK_MAX_MINOR ? null : QUICK_MAX_MINOR })}>Under £25</Choice>
        )}
        <Button size="small" variant="ghost" aria-haspopup="dialog" onClick={() => setOpen(true)}>More filters</Button>
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby="filter-dialog-title">
        <DialogTitle id="filter-dialog-title">Sort and filter</DialogTitle>
        <DialogContent>
          <ListFilters sort={sort} filters={filters} maxPounds={maxPounds} ranked={ranked} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
