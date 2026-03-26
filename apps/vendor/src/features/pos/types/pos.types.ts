export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  price: number;
  stockQty: number;
  taxRate?: number;
  isActive: boolean;
};

export type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  stockQty: number;
  taxRate: number;
  discountAmount: number;
};

export type PosCart = {
  lines: CartLine[];
  note?: string;
};

export type CartTotals = {
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
};

export type SalePaymentMethod = "CASH" | "CARD" | "QR";

export type SalePaymentLine = {
  method: SalePaymentMethod;
  amount: number;
  attemptId?: string;
  transactionId?: string;
  invoiceId?: string;
};

export type SalePayload = {
  shiftId: string;
  branchId: string;
  registerId?: string;
  organizationId?: string;
  clientSaleId?: string;
  paymentMethod: string;
  paymentBreakdown?: SalePaymentLine[];
  totalPaid?: number;
  remaining?: number;
  status?: "PARTIAL" | "PAID";
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxRate: number;
  }>;
  note?: string;
};
