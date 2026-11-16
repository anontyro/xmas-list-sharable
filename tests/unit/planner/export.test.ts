import { describe, expect, it } from "vitest";
import { computePlan } from "@/features/planner/accounting";
import { formatCsv } from "@/features/planner/export/csv";
import { formatMarkdown } from "@/features/planner/export/markdown";
import { formatText } from "@/features/planner/export/text";
import type { ExportEntry, ExportInput } from "@/features/planner/export/types";

const entry = (over: Partial<ExportEntry>): ExportEntry => ({
  recipient: "Alex", occasion: "Christmas 2026", title: "Item", url: null, note: "", state: "reserved",
  listedPriceMinor: null, actualPriceMinor: null, included: true, ...over,
});

const input = (entries: ExportEntry[], over: Partial<ExportInput> = {}): ExportInput => ({
  heading: "Christmas 2026", entries, totals: computePlan(entries, 25000), budgetMinor: 25000, includeNotes: false, ...over,
});

const appendixB = [
  entry({ title: "Noise-Cancelling Headphones", state: "reserved", listedPriceMinor: 12999, url: "https://example.com/headphones" }),
  entry({ title: "Fantasy Novel", state: "interested", listedPriceMinor: 1499, url: "https://example.com/book" }),
  entry({ recipient: "Sarah", title: "Cookbook", state: "purchased", listedPriceMinor: 2499, actualPriceMinor: 1950, url: "https://example.com/cookbook" }),
];

/** A small RFC 4180 reader, so the CSV tests check real round-tripping rather than string shapes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\r" && text[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
    else cell += c;
  }
  return rows;
}

describe("formatText", () => {
  it("reproduces PRD Appendix B exactly", () => {
    expect(formatText(input(appendixB))).toBe(
      [
        "Christmas 2026 — My Gift Planner",
        "",
        "Alex",
        "- Noise-Cancelling Headphones — Reserved — £129.99",
        "  https://example.com/headphones",
        "- Fantasy Novel — Interested — £14.99",
        "  https://example.com/book",
        "",
        "Sarah",
        "- Cookbook — Purchased — £24.99 (paid £19.50)",
        "  https://example.com/cookbook",
        "",
        "Estimated committed: £149.49",
        "Actual spent: £19.50",
        "Budget: £250.00",
        "Remaining committed budget: £100.51",
        "",
      ].join("\n"),
    );
  });
  it("copes with no price, no url, no budget, over budget and unpriced items", () => {
    const entries = [entry({ title: "Mystery" }), entry({ title: "Big", listedPriceMinor: 30000 })];
    const t = formatText(input(entries, { totals: computePlan(entries, 25000) }));
    expect(t).toContain("- Mystery — Reserved — No price\n");
    expect(t).toContain("Remaining committed budget: -£50.00");
    expect(t).toContain("1 item without a price (not counted)");
    const noBudget = formatText(input(entries, { budgetMinor: null, totals: computePlan(entries, null) }));
    expect(noBudget).not.toContain("Budget:");
    expect(noBudget).not.toContain("Remaining");
  });
  it("keeps a title or recipient with line breaks on one line", () => {
    const t = formatText(input([entry({ recipient: "Al\nex", title: "Two\nlines  here" })]));
    expect(t).toContain("\nAl ex\n- Two lines here — Reserved");
  });
  it("writes notes only when asked, on one line", () => {
    const e = [entry({ title: "X", note: "line one\nline two" })];
    expect(formatText(input(e))).not.toContain("Note:");
    expect(formatText(input(e, { includeNotes: true }))).toContain("  Note: line one line two\n");
  });
});

describe("formatMarkdown", () => {
  it("has headings per recipient, links and totals", () => {
    const md = formatMarkdown(input(appendixB));
    expect(md).toContain("# Christmas 2026 — My Gift Planner");
    expect(md).toContain("## Alex");
    expect(md).toContain("- **Fantasy Novel** — Interested — £14.99");
    expect(md).toContain("  - [Link](https://example.com/book)");
    expect(md).toContain("- Remaining committed budget: £100.51");
  });
  it("escapes Markdown characters in titles and keeps odd URLs from ending the link", () => {
    const md = formatMarkdown(input([entry({ title: "A *bold* [link](x) _it_", url: "https://x.example/a(b)?q=1 2", note: "# not a heading" })], { includeNotes: true }));
    expect(md).toContain("**A \\*bold\\* \\[link\\]\\(x\\) \\_it\\_**");
    expect(md).toContain("[Link](https://x.example/a%28b%29?q=1%202)");
    expect(md).toContain("Note: \\# not a heading");
  });
});

describe("formatCsv", () => {
  it("round-trips commas, quotes and line breaks through a CSV parser", () => {
    const title = 'Hat, "red"\nand warm';
    const rows = parseCsv(formatCsv(input([entry({ title, listedPriceMinor: 1250, url: "https://x.example/?a=1,2" })])));
    expect(rows[0]).toEqual(["Recipient", "Occasion", "Item", "Status", "Listed price", "Actual price", "URL"]);
    expect(rows[1]).toEqual(["Alex", "Christmas 2026", title, "Reserved", "12.50", "", "https://x.example/?a=1,2"]);
    expect(rows).toHaveLength(2);
  });
  it("ends every row with CRLF", () => {
    const csv = formatCsv(input(appendixB));
    expect(csv.split("\r\n")).toHaveLength(5); // header + 3 rows + trailing empty
    expect(csv.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
  it.each(['=HYPERLINK("http://evil")', "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"])("neutralises a formula-looking cell: %j", (value) => {
    const rows = parseCsv(formatCsv(input([entry({ title: value, recipient: value, url: value })], { includeNotes: true })));
    expect(rows[1][2]).toBe(`'${value}`);
    expect(rows[1][0]).toBe(`'${value}`);
    expect(rows[1][6]).toBe(`'${value}`);
  });
  it("does not touch ordinary cells, and adds a Note column only when asked", () => {
    const e = [entry({ title: "Plain", note: "n" })];
    expect(parseCsv(formatCsv(input(e)))[0]).not.toContain("Note");
    const withNotes = parseCsv(formatCsv(input(e, { includeNotes: true })));
    expect(withNotes[0].at(-1)).toBe("Note");
    expect(withNotes[1][2]).toBe("Plain");
    expect(withNotes[1].at(-1)).toBe("n");
  });
  it("keeps the URL for every entry that has one, across all three formats", () => {
    for (const fmt of [formatText, formatMarkdown, formatCsv]) {
      const out = fmt(input(appendixB));
      for (const e of appendixB) expect(out).toContain(e.url!);
    }
    const noUrl = [entry({ title: "No link" })];
    for (const fmt of [formatText, formatMarkdown, formatCsv]) expect(fmt(input(noUrl))).toContain("No link");
  });
});
