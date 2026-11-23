export type PosCreditListLine = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  discount: number;
  measureUnit: string | null;
  lineTotal: number;
};

export type PosCreditListItem = {
  id: string;
  customerId: string | null;
  saleId: string;
  receiptNo: string;
  status: string;
  targetType: string;
  borrowerId: string;
  borrowerUserId?: string | null;
  borrowerName: string;
  borrowerPhone: string | null;
  borrowerEmail: string | null;
  borrowerAddress: string | null;
  employeeId: string | null;
  employeeName: string | null;
  principalAmount: number;
  monthlyInterestRate: number;
  totalInterest: number;
  totalDue: number;
  termMonths: number;
  dueDate: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentNote: string | null;
  createdAt: string;
  lines: PosCreditListLine[];
};

export type PosCreditRepaymentSelection = PosCreditListItem & {
  repaymentAmount?: number;
  repaymentAllocations?: Array<{ creditSaleId: string; amount: number }>;
  isBulk?: boolean;
  creditIds?: string[];
  credits?: PosCreditListItem[];
};
