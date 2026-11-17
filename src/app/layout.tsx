import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import { currentGuest } from "@/lib/auth/require";
import ThemeRegistry from "@/theme/ThemeRegistry";

export const metadata: Metadata = {
  title: "Family Gifts",
  description: "Family Christmas wishlists and gift coordination",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // My Planner is shown only to a browser that has a guest session.
  const guest = Boolean(await currentGuest());
  const links = guest ? [{ label: "My Planner", href: "/planner" }] : [];
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AppShell links={links} guest={guest}>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
