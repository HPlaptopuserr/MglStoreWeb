import ProductHistoryScope from "@/components/ProductHistoryScope";
import OrgShell from "@/components/OrgShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgShell>
      <ProductHistoryScope>{children}</ProductHistoryScope>
    </OrgShell>
  );
}
