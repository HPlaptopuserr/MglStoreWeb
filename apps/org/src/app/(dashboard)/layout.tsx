import OrgShell from "@/components/OrgShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrgShell>{children}</OrgShell>;
}
