export interface WarehouseViewerMember {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string | null;
  email: string;
  createdAt: string;
}

export interface WarehouseViewerSession {
  viewerOnly: boolean;
  warehouses: Array<{
    id: string;
    name: string;
    address: string;
    accessMode: "OPERATOR" | "VIEWER";
    organizations: Array<{ id: string; name: string }>;
  }>;
}

export interface WarehouseInvestorProduct {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  quantity: number;
  price: number;
  costPrice: number | null;
  stockCost: number | null;
}

export interface WarehouseInvestorSale {
  id: string;
  number: string;
  channel: "RETAIL" | "WHOLESALE";
  paidAt: string;
  revenue: number;
  cost: number | null;
  grossProfit: number | null;
  products: string;
}

export interface WarehouseInvestorReport {
  warehouse: { id: string; name: string; address: string };
  inventory: {
    productCount: number;
    inStockCount: number;
    stockCost: number;
    stockValue: number;
    missingCostCount: number;
  };
  sales: {
    orderCount: number;
    revenue: number;
    cost: number;
    grossProfit: number | null;
    missingCostCount: number;
  };
  products: { items: WarehouseInvestorProduct[]; total: number };
  history: { items: WarehouseInvestorSale[]; total: number };
}
