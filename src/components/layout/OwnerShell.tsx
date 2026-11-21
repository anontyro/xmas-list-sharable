import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { member } from "@/db/schema";
import { listOwnLists, newestOpenList } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";
import AccountMenu from "./AccountMenu";
import ShellFrame from "./ShellFrame";
import type { NavItem } from "./nav";

/** Chrome for owner pages. Signed out it shows only the brand; signed in it adds Family, "My list" (the newest list that is not archived), the gift links and the account menu. The brand goes to the family home. */
export default async function OwnerShell({ children }: { children: React.ReactNode }) {
  const owner = await currentOwner();
  if (!owner) return <ShellFrame brandHref="/" items={[]}>{children}</ShellFrame>;

  const [row] = await getDb().select({ displayName: member.displayName }).from(member).where(eq(member.id, owner.memberId));
  const primary = newestOpenList(await listOwnLists());
  const myList = primary ? `/owner/lists/${primary.id}` : "/owner";
  const addGift = primary ? `/owner/lists/${primary.id}/add` : null;
  const importGifts = primary ? `/owner/lists/${primary.id}/import` : null;
  const items: NavItem[] = [
    { label: "Family", href: "/", sticker: "tree", match: ["/"] },
    { label: "My list", href: myList, sticker: "heartlist", match: ["/owner/lists"], exclude: [addGift, importGifts].filter((p): p is string => p !== null) },
    ...(addGift && importGifts
      ? [
          { label: "Add a gift", href: addGift, sticker: "presentgold" as const, match: [addGift] },
          { label: "Import", href: importGifts, sticker: "download" as const, match: [importGifts] },
        ]
      : []),
  ];
  return (
    <ShellFrame
      brandHref="/"
      items={items}
      right={<AccountMenu id={owner.memberId} name={row?.displayName ?? "Owner"} member={{ pending: false, canEdit: true, myListHref: myList }} />}
    >
      {children}
    </ShellFrame>
  );
}
