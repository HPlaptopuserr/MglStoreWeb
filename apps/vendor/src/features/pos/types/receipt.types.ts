export type ReceiptLine = {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
};

export type PosReceipt = {
  id: string;
  receiptNo: string;
  branchName: string;
  cashierName: string;
  paymentMethod: string;
  paymentBreakdown?: Array<{
    method: string;
    amount: number;
    transactionId?: string;
    invoiceId?: string;
    attemptId?: string;
    traceno?: string | null;
    terminalId?: string | null;
  }>;
  createdAt: string;
  lines: ReceiptLine[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
};
