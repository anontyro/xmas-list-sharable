"use client";

import { createTheme } from "@mui/material/styles";

const palette = {
  pine: "#24764F",
  holly: "#D8494F",
  gold: "#F3C65D",
  cream: "#FFF7EA",
  slate: "#334155",
};

export const theme = createTheme({
  palette: {
    primary: { main: palette.pine },
    secondary: { main: palette.holly },
    warning: { main: palette.gold },
    background: { default: palette.cream, paper: "#FFFFFF" },
    text: { primary: palette.slate },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44, textTransform: "none" } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiCssBaseline: {
      styleOverrides: {
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": { animation: "none !important", transition: "none !important" },
        },
      },
    },
  },
});
