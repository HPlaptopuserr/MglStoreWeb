import { InventoryDashboard } from "@/features/building/management/InventoryDashboard";
export default function InventoryPage() {
  return (
    <div className="inventory-page">
      <header className="management-heading">
        <div>
          <p className="building-eyebrow">БАЙРНЫ НӨӨЦ</p>
          <h1>Байрны бүртгэл</h1>
        </div>
      </header>
      <InventoryDashboard />
    </div>
  );
}
