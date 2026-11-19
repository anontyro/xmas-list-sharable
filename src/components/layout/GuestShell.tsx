import { cookies } from "next/headers";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import { LAST_LIST_COOKIE, parseLastList } from "@/lib/last-list";
import AccountMenu from "./AccountMenu";
import { PickNameChip } from "./TopBar";
import ShellFrame from "./ShellFrame";
import type { NavItem } from "./nav";

/** Chrome for the family, list and planner pages: Family always; Wishlist and My planner once the visitor has a name. */
export default async function GuestShell({ children }: { children: React.ReactNode }) {
  const guest = await getGuestIdentity();
  const last = parseLastList((await cookies()).get(LAST_LIST_COOKIE)?.value);
  const items: NavItem[] = [{ label: "Family", href: "/", sticker: "tree", match: ["/", "/earlier"] }];
  if (guest) {
    items.push({ label: "Wishlist", href: last ? `/l/${last}` : "/", sticker: "heartlist", match: ["/l"] });
    items.push({ label: "My planner", tabLabel: "Planner", href: "/planner", sticker: "wallet", match: ["/planner"] });
  }
  return (
    <ShellFrame brandHref="/" items={items} right={guest ? <AccountMenu kind="guest" id={guest.guestId} name={guest.displayName} /> : <PickNameChip />}>
      {children}
    </ShellFrame>
  );
}
