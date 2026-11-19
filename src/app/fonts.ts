import localFont from "next/font/local";

// Self-hosted from the @fontsource packages, so a build never needs the network. Latin only; anything else falls back to the
// system font. next/font needs every option written out as a literal, so the paths are spelled in full.

/** Lilita One: headings, buttons and numbers. */
export const display = localFont({
  src: "../../node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/** Nunito Sans: body text. */
export const body = localFont({
  src: [
    { path: "../../node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});
