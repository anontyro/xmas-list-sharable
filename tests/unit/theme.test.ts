import { createElement } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { describe, expect, it } from "vitest";
import { theme } from "@/theme/theme";
import { tokens } from "@/theme/tokens";

describe("theme", () => {
  it("maps the design tokens onto the MUI palette", () => {
    const { palette } = theme;
    expect(palette.primary.main).toBe(tokens.red);
    expect(palette.secondary.main).toBe(tokens.green);
    expect(palette.text.primary).toBe(tokens.ink);
    expect(palette.text.secondary).toBe(tokens.muted);
    expect(palette.background.default).toBe(tokens.cream);
    expect(palette.background.paper).toBe(tokens.white);
    expect([palette.yellow.main, palette.sky.main, palette.pink.main, palette.mint.main]).toEqual([tokens.yellow, tokens.sky, tokens.pink, tokens.mint]);
  });

  it("switches layout at 860 px", () => {
    expect(theme.breakpoints.values.md).toBe(860);
    expect(theme.breakpoints.up("md")).toContain("860px");
  });

  it("has a dashed ghost button and filled tint colours for buttons and chips", () => {
    const variants = theme.components?.MuiButton?.variants as { props: { variant?: string; color?: string }; style: Record<string, unknown> }[];
    const ghost = variants.find((v) => v.props.variant === "ghost");
    expect(ghost?.style).toMatchObject({ borderStyle: "dashed", boxShadow: "none" });
    for (const color of ["yellow", "sky", "pink", "mint"]) {
      expect(variants.some((v) => v.props.variant === "contained" && v.props.color === color), `button ${color}`).toBe(true);
    }
    const chips = theme.components?.MuiChip?.variants as { props: { color?: string } }[];
    for (const color of ["yellow", "sky", "pink", "mint"]) expect(chips.some((v) => v.props.color === color), `chip ${color}`).toBe(true);
  });

  it("uses the display font for headings and buttons and the body font elsewhere", () => {
    expect(theme.typography.h1.fontFamily).toContain("--font-display");
    expect(theme.typography.button.fontFamily).toContain("--font-display");
    expect(theme.typography.fontFamily).toContain("--font-body");
  });

  it("only accepts the palette's colours (type check)", () => {
    createElement(Button, { color: "yellow" });
    createElement(Chip, { color: "mint" });
    // @ts-expect-error not a colour in this theme
    createElement(Button, { color: "purple" });
  });
});
