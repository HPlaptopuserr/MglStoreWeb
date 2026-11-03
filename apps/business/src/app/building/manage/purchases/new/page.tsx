import { InventoryDashboard } from "@/features/building/management/InventoryDashboard";
export default function NewPurchasePage() {
  return (
    <div className="inventory-page">
      <header className="management-heading">
        <div>
          <p className="building-eyebrow">БАЙР → ЗАХИАЛАГЧ → ТӨЛБӨР → ГЭРЭЭ</p>
          <h1>Байр захиалах</h1>
          <p>Төсөл, блок, давхраар шүүж боломжтой байраа сонгоорой.</p>
        </div>
      </header>
      <InventoryDashboard booking />
    </div>
  );
}
