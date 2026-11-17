"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { setEntryDetails } from "@/features/planner/actions";
import { minorToPounds } from "@/lib/money";

/** Private note, price actually paid and "include in totals" for one planner entry. Only this guest ever sees them. */
export default function EntryNotes({ itemId, title, note, actualPriceMinor, included, canEnterPrice }: {
  itemId: string; title: string; note: string; actualPriceMinor: number | null; included: boolean; canEnterPrice: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState({ note, actualPrice: minorToPounds(actualPriceMinor), included });
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string }>();
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(undefined);
    start(async () => {
      const r = await setEntryDetails({ itemId, ...values });
      setMessage(r.ok ? { severity: "success", text: "Saved" } : { severity: "error", text: r.error.message });
      if (r.ok) router.refresh();
    });
  };

  return (
    <Accordion disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>Notes and price paid{note ? " (has a note)" : ""}</AccordionSummary>
      <AccordionDetails>
        <Stack component="form" spacing={2} onSubmit={save} aria-label={`Details for ${title}`}>
          <TextField label="Private note" helperText="Only you can see this" multiline minRows={2} size="small" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} slotProps={{ htmlInput: { maxLength: 500 } }} />
          {canEnterPrice && (
            <TextField label="Price you paid (£)" size="small" value={values.actualPrice} onChange={(e) => setValues({ ...values, actualPrice: e.target.value })} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
          )}
          <FormControlLabel label="Include in my totals" control={<Checkbox checked={values.included} onChange={(e) => setValues({ ...values, included: e.target.checked })} />} />
          {message && <Alert severity={message.severity}>{message.text}</Alert>}
          <Button type="submit" variant="contained" disabled={pending}>Save</Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
