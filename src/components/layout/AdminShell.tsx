import ActionButton from "@/components/ui/ActionButton";
import Pill from "@/components/sticker/Pill";
import { adminLogout } from "@/features/authentication/admin-login";
import { currentAdmin } from "@/lib/auth/require";
import ShellFrame from "./ShellFrame";
import type { NavItem } from "./nav";

/** Chrome for admin pages. Signed out it shows only the brand; signed in it adds Members and a Sign out button (always visible: admin has no menu). */
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  if (!(await currentAdmin())) return <ShellFrame brandHref="/" items={[]}>{children}</ShellFrame>;
  const items: NavItem[] = [{ label: "Members", href: "/admin", sticker: "child", match: ["/admin"] }];
  return (
    <ShellFrame
      brandHref="/admin"
      items={items}
      right={
        <>
          <Pill tone="yellow">Admin</Pill>
          <ActionButton onAction={adminLogout} size="small" variant="outlined">Sign out</ActionButton>
        </>
      }
    >
      {children}
    </ShellFrame>
  );
}
