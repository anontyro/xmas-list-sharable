import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import { body, display } from "./fonts";

export const metadata: Metadata = {
  title: "Family Gifts",
  description: "Family Christmas wishlists and gift coordination",
};

/** Theme and fonts only. The top bar and tabs come from each route group's layout, so every role gets its own. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
