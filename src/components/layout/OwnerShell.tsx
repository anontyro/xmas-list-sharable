import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { member } from "@/db/schema";
import Pill from "@/components/sticker/Pill";
import { listOwnLists, newestOpenList } from "@/features/wishlists/owner-queries";
import { currentOwner } from "@/lib/auth/require";
import AccountMenu from "./AccountMenu";
import ShellFrame from "./ShellFrame";
import type { NavItem } from "./nav";

/** Chrome for owner pages. Signed out it shows only the brand; signed in it adds "My list" (the newest list that is not archived) and the account menu. */
export default async function OwnerShell({ children }: { children: React.ReactNode }) {
  const owner = await currentOwner();
  if (!owner) return <ShellFrame brandHref="/" items={[]}>{children}</ShellFrame>;

  const [row] = await getDb().select({ displayName: member.displayName }).from(member).where(eq(member.id, owner.memberId));
  const primary = newestOpenList(await listOwnLists());
  const myList = primary ? `/owner/lists/${primary.id}` : "/owner";
  const items: NavItem[] = [{ label: "My list", href: myList, sticker: "heartlist", match: ["/owner/lists"] }];
  return (
    <ShellFrame
      brandHref="/owner"
      items={items}
      right={
        <>
          <Pill tone="mint">Owner</Pill>
          <AccountMenu kind="owner" id={owner.memberId} name={row?.displayName ?? "Owner"} myListHref={myList} />
        </>
      }
    >
      {children}
    </ShellFrame>
  );
}
