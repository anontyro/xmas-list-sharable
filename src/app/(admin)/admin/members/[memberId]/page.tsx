import { redirect } from "next/navigation";

/** The member screen now lives on /admin (decision 0024). */
export default function MemberPage() {
  redirect("/admin");
}
