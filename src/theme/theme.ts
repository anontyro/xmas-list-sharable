"use client";

import { createTheme, type Theme } from "@mui/material/styles";
import { DESKTOP_PX, dotGrid, RED_BAR_CLASS, shadows, tokens } from "./tokens";

const { ink, cream, red, green, yellow, pink, sky, mint, muted, white, danger } = tokens;

const body = 'var(--font-body), system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const display = 'var(--font-display), "Lilita One", system-ui, sans-serif';

const border = (w = 3) => `${w}px solid ${ink}`;
const ring = { outline: `3px solid ${ink}`, outlineOffset: 2 } as const;

/** [palette key, background, text on it]. White text on red and green, ink on the tints (all pass AA, see theme-contrast.test.ts). */
const filled = [
  ["primary", red, white],
  ["secondary", green, white],
  ["yellow", yellow, ink],
  ["sky", sky, ink],
  ["pink", pink, ink],
  ["mint", mint, ink],
] as const;

const buttonColorVariants = filled.flatMap(([color, bg, fg]) => [
  { props: { variant: "contained" as const, color }, style: { backgroundColor: bg, color: fg, "&:hover": { backgroundColor: bg } } },
]);

const plain = { backgroundColor: white, color: ink, "&:hover": { backgroundColor: white } };

export const theme: Theme = createTheme({
  breakpoints: { values: { xs: 0, sm: 600, md: DESKTOP_PX, lg: 1200, xl: 1536 } },
  shape: { borderRadius: 12 },
  palette: {
    primary: { main: red, contrastText: white },
    secondary: { main: green, contrastText: white },
    yellow: { main: yellow, contrastText: ink },
    sky: { main: sky, contrastText: ink },
    pink: { main: pink, contrastText: ink },
    mint: { main: mint, contrastText: ink },
    success: { main: green, contrastText: white },
    warning: { main: yellow, contrastText: ink },
    info: { main: sky, contrastText: ink },
    error: { main: danger, contrastText: white },
    text: { primary: ink, secondary: muted },
    background: { default: cream, paper: white },
    divider: ink,
  },
  typography: {
    fontFamily: body,
    fontWeightRegular: 600,
    fontWeightMedium: 700,
    fontWeightBold: 800,
    h1: { fontFamily: display, fontWeight: 400, fontSize: "2.875rem", lineHeight: 1 },
    h2: { fontFamily: display, fontWeight: 400, fontSize: "2.375rem", lineHeight: 1.05 },
    h3: { fontFamily: display, fontWeight: 400, fontSize: "1.875rem", lineHeight: 1.05 },
    h4: { fontFamily: display, fontWeight: 400, fontSize: "2rem", lineHeight: 1.05 },
    h5: { fontFamily: display, fontWeight: 400, fontSize: "1.625rem", lineHeight: 1.1 },
    h6: { fontFamily: display, fontWeight: 400, fontSize: "1.375rem", lineHeight: 1.1 },
    subtitle1: { fontWeight: 800, fontSize: "1.0625rem", lineHeight: 1.2 },
    subtitle2: { fontWeight: 800, fontSize: "0.875rem", lineHeight: 1.2 },
    body1: { fontSize: "1rem", lineHeight: 1.3 },
    body2: { fontSize: "0.875rem", lineHeight: 1.3 },
    caption: { fontWeight: 700, fontSize: "0.75rem" },
    button: { fontFamily: display, fontWeight: 400, fontSize: "1rem", textTransform: "none", lineHeight: 1.2 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: dotGrid,
        // One focus ring everywhere: ink, 3 px, 2 px off. The red top bar gets cream because ink is only 2.9:1 on red.
        ":focus-visible": ring,
        ".MuiButtonBase-root.Mui-focusVisible": ring,
        // Text fields draw the ring on the whole field, not on the bare input inside it.
        ".MuiInputBase-input:focus-visible": { outline: "none" },
        [`.${RED_BAR_CLASS} :focus-visible, .MuiAppBar-colorPrimary :focus-visible, .MuiAppBar-colorPrimary .Mui-focusVisible`]: { outlineColor: cream },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": { animation: "none !important", transition: "none !important" },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: {
          minHeight: 44,
          padding: "0 16px",
          border: border(),
          borderRadius: 14,
          boxShadow: shadows.button,
          fontSize: "1rem",
          whiteSpace: "nowrap",
          transition: "transform 80ms, box-shadow 80ms",
          "&:hover": { transform: "translateY(1px)", boxShadow: shadows.buttonPressed },
          "&:active": { transform: "translateY(3px)", boxShadow: "none" },
          "&.Mui-disabled": { opacity: 0.5, color: ink, borderColor: ink, boxShadow: "none" },
        },
        sizeSmall: { minHeight: 40, padding: "0 12px", fontSize: "0.9375rem" },
        sizeLarge: { minHeight: 54, fontSize: "1.1875rem" },
        // Text and outlined buttons are the design's plain white button; colour comes from `contained`.
        outlined: { borderColor: ink, ...plain },
        text: { borderColor: ink, ...plain },
      },
      variants: [
        ...buttonColorVariants,
        // `color="inherit"` is the plain white button in every variant (it is what the top bar uses).
        ...(["contained", "outlined", "text"] as const).map((variant) => ({ props: { variant, color: "inherit" as const }, style: { ...plain, color: ink } })),
        ...(["outlined", "text"] as const).flatMap((variant) =>
          filled.map(([color]) => ({ props: { variant, color }, style: { color: ink, borderColor: ink } })),
        ),
        {
          props: { variant: "ghost" as const },
          style: { backgroundColor: "transparent", color: ink, boxShadow: "none", borderStyle: "dashed", "&:hover": { backgroundColor: "transparent", boxShadow: "none" } },
        },
      ],
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
      variants: [{ props: { variant: "elevation" as const }, style: { border: border(), borderRadius: 18, boxShadow: shadows.card } }],
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: red, color: cream, border: 0, borderBottom: border(4), borderRadius: 0, boxShadow: "none" },
      },
    },
    MuiToolbar: { styleOverrides: { root: { minHeight: 60 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: white,
          fontWeight: 700,
          fontSize: "1rem",
          // The border is 3 px, so the usual notch in it is too tight for the floating label. The label gets a white backing instead.
          "& .MuiOutlinedInput-notchedOutline": { borderWidth: 3, borderColor: ink },
          "& .MuiOutlinedInput-notchedOutline legend": { display: "none" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: ink },
          "&.Mui-focused": ring,
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 3, borderColor: ink },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: danger },
          "&.Mui-disabled": { backgroundColor: cream },
        },
        input: { minHeight: "1.4375em" },
        sizeSmall: { minHeight: 40 },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: muted,
          fontWeight: 800,
          "&.Mui-focused": { color: ink },
          "&.Mui-error": { color: danger },
          "&.MuiInputLabel-shrink": { backgroundColor: white, padding: "0 6px", transform: "translate(11px, -11px) scale(0.75)", zIndex: 1 },
        },
      },
    },
    MuiFormHelperText: { styleOverrides: { root: { color: muted, fontWeight: 700, fontSize: "0.8125rem", "&.Mui-error": { color: danger } } } },
    MuiChip: {
      styleOverrides: {
        root: { height: 26, border: border(2), borderRadius: 12, fontWeight: 800, fontSize: "0.75rem", color: ink, "&.MuiChip-clickable:hover": { backgroundColor: yellow }, "&.Mui-disabled": { opacity: 0.5 } },
        filled: { backgroundColor: white },
        outlined: { borderColor: ink },
        label: { padding: "0 9px" },
      },
      variants: [
        ...(["primary", "secondary"] as const).map((color) => ({
          props: { variant: "filled" as const, color },
          style: { backgroundColor: color === "primary" ? red : green, color: white },
        })),
        ...(["yellow", "sky", "pink", "mint"] as const).map((color) => ({
          props: { variant: "filled" as const, color },
          style: { backgroundColor: { yellow, sky, pink, mint }[color], color: ink },
        })),
      ],
    },
    MuiAlert: {
      styleOverrides: {
        root: { border: border(), borderRadius: 14, fontWeight: 700, fontSize: "0.875rem", color: ink },
        icon: { color: ink },
      },
      variants: (
        [["success", mint], ["info", sky], ["warning", yellow], ["error", pink]] as const
      ).map(([severity, backgroundColor]) => ({ props: { variant: "standard" as const, severity }, style: { backgroundColor } })),
    },
    MuiLink: {
      defaultProps: { underline: "always" },
      // Hover thickens the underline, so the change does not depend on colour.
      styleOverrides: { root: { fontWeight: 800, textDecorationThickness: "1px", textUnderlineOffset: 3, "&:hover": { textDecorationThickness: "3px" } } },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 46,
          fontWeight: 800,
          fontSize: "0.9375rem",
          borderRadius: 10,
          "&:hover": { backgroundColor: yellow },
          "&.Mui-focusVisible": { backgroundColor: yellow },
          "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: sky },
          "&.Mui-disabled": { opacity: 0.5 },
        },
      },
    },
    MuiCheckbox: { styleOverrides: { root: { color: ink, "&.Mui-checked": { color: ink }, "&:hover": { backgroundColor: yellow }, "&.Mui-disabled": { opacity: 0.5, color: ink } } } },
    MuiSlider: {
      styleOverrides: {
        root: { color: ink, "&.Mui-disabled": { opacity: 0.5, color: ink } },
        thumb: { backgroundColor: yellow, border: border(), "&:hover, &.Mui-focusVisible, &.Mui-active": { boxShadow: "none", backgroundColor: red }, "&.Mui-focusVisible": ring },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontFamily: display, fontWeight: 400, fontSize: "1.5rem" } } },
  },
});
