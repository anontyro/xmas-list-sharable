import { redirect } from "next/navigation";
import Hero from "@/components/sticker/Hero";
import PageWrap from "@/components/sticker/PageWrap";
import TwoColumn from "@/components/sticker/TwoColumn";
import AddMemberForm from "@/features/family/components/AddMemberForm";
import AdminMemberCard from "@/features/family/components/AdminMemberCard";
import CreateListForm from "@/features/family/components/CreateListForm";
import { listMembersForAdmin } from "@/features/family/queries";
import { currentAdmin } from "@/lib/auth/require";

export const metadata = { title: "Admin · Family Gifts", robots: { index: false } };

export default async function AdminPage() {
  if (!(await currentAdmin())) redirect("/admin/login");
  const members = await listMembersForAdmin();
  const active = members.filter((m) => m.active);
  return (
    <>
      <Hero title="Family admin" subtitle="Members, lists and owner PINs. Gift plans stay private." tint="sky" sticker={{ name: "bookmark", width: 64, rotate: 6 }} />
      <PageWrap>
        <TwoColumn
          main={
            members.length === 0 ? (
              <p>No members yet. Add the first one.</p>
            ) : (
              members.map((m) => <AdminMemberCard key={m.id} member={m} />)
            )
          }
          side={
            <>
              <AddMemberForm />
              <CreateListForm members={active} year={new Date().getFullYear()} />
            </>
          }
        />
      </PageWrap>
    </>
  );
}
