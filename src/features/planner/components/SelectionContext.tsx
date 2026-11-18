"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Checkbox from "@mui/material/Checkbox";

type Selection = {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  setAll: (ids: string[]) => void;
  clear: () => void;
};

const Ctx = createContext<Selection | null>(null);

/** Which planner entries are ticked for export. Local to the page; nothing is saved. */
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback((id: string) => setSelected((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; }), []);
  const setAll = useCallback((ids: string[]) => setSelected(new Set(ids)), []);
  const clear = useCallback(() => setSelected(new Set()), []);
  const value = useMemo(() => ({ selected, toggle, setAll, clear }), [selected, toggle, setAll, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelection(): Selection {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSelection must be used inside SelectionProvider");
  return ctx;
}

export function EntrySelect({ itemId, title }: { itemId: string; title: string }) {
  const { selected, toggle } = useSelection();
  return (
    <Checkbox checked={selected.has(itemId)} onChange={() => toggle(itemId)} slotProps={{ input: { "aria-label": `Select ${title}` } }} />
  );
}
