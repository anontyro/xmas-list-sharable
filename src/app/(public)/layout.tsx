import GuestShell from "@/components/layout/GuestShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <GuestShell>{children}</GuestShell>;
}
