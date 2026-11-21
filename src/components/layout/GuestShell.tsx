import { cookies } from "next/headers";
import { getViewer } from "@/features/authentication/guest-session";
import { listOwnLists, newestOpenList } from "@/features/wishlists/owner-queries";
import { LAST_LIST_COOKIE, parseLastList } from "@/lib/last-list";
import AccountMenu from "./AccountMenu";
import { PickNameChip } from "./TopBar";
import ShellFrame from "./ShellFrame";
import type { NavItem } from "./nav";

/**
 * Chrome for the family, list and planner pages: Family always; Wishlist and My planner once the visitor has a name.
 * A member who can edit also gets My list, and their menu is the member menu (decision 0028).
 */
export default async function GuestShell({ children }: { children: React.ReactNode }) {
  const { guest, owner } = await getViewer();
  const last = parseLastList((await cookies()).get(LAST_LIST_COOKIE)?.value);
  const items: NavItem[] = [{ label: "Family", href: "/", sticker: "tree", match: ["/", "/earlier"] }];
  let member: { pending: boolean; canEdit: boolean; myListHref: string } | undefined;
  if (guest) {
    const canEdit = guest.memberId !== null && owner?.memberId === guest.memberId;
    const primary = canEdit ? newestOpenList(await listOwnLists()) : null;
    const myListHref = primary ? `/owner/lists/${primary.id}` : "/owner";
    if (guest.memberId) member = { pending: guest.pending, canEdit, myListHref };
    if (canEdit) items.push({ label: "My list", href: myListHref, sticker: "heartlist", match: ["/owner"] });
    items.push({ label: "Wishlist", href: last ? `/l/${last}` : "/", sticker: "heartlist", match: ["/l"] });
    items.push({ label: "My planner", tabLabel: "Planner", href: "/planner", sticker: "wallet", match: ["/planner"] });
  }
  return (
    <ShellFrame brandHref="/" items={items} right={guest ? <AccountMenu id={guest.guestId} name={guest.displayName} member={member} /> : <PickNameChip />}>
      {children}
    </ShellFrame>
  );
}
