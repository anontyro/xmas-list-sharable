import OwnerShell from "@/components/layout/OwnerShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>;
}
