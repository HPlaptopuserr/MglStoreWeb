export interface WarehouseViewerMember {
  bankAccount?: WarehouseInvestorBankAccount | null;
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string | null;
  email: string;
  createdAt: string;
  investmentAmount: string;
  investmentVersion: number;
  investmentUpdatedAt: string | null;
  monthlyDividend?: WarehouseMonthlyDividend & { version: number };
}

export interface WarehouseInvestorBankAccount {
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  confirmedAt: string;
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

export type WarehouseDividendChoice = "BANK_TRANSFER" | "REINVEST";
export interface WarehouseDividendDecisionSummary {
  choice: WarehouseDividendChoice;
  confirmedAt: string;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
}
export type WarehouseDividendConfirmation =
  | { status: "PENDING" }
  | { status: "CONFIRMED"; decision: WarehouseDividendDecisionSummary };

export interface WarehouseDividendVerification {
  id: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
}

export interface WarehouseMonthlyDividend {
  id?: string;
  version?: number;
  decision?: WarehouseDividendDecisionSummary | null;
  month: string;
  amount: string;
  updatedAt: string | null;
}

/** Calendar month in the warehouse business timezone, including month boundaries. */
export function currentWarehouseMonth(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export interface WarehouseInvestmentSummary {
  amount: string;
  currency: "MNT";
  scope: "PERSONAL" | "WAREHOUSE";
  monthlyDividend?: WarehouseMonthlyDividend;
  updatedAt: string | null;
}

export interface WarehouseInvestorReport {
  investment: WarehouseInvestmentSummary;
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

/** Format recorded decimal money without converting principal to floating point. */
export function formatWarehouseInvestment(value: string): string {
  const [whole, fraction = ""] = value.split(".");
  const digits = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimal = fraction.replace(/0+$/, "");
  return `${digits}${decimal ? `.${decimal}` : ""} ₮`;
}
