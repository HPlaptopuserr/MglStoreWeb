export interface CustomerRecord {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  agreedPriceTotal: string | null;
  agreedPricePerM2: string | null;
  downPaymentPercent: string | null;
  note: string | null;
  createdAt: string;
  paid: string;
  remaining: string | null;
  overdue: string;
  unit: {
    unitNo: string;
    rooms: number | null;
    areaM2: string | null;
    floor: { number: number; block: { name: string; projectId: string } };
  };
  downPaymentPaid: string;
  downPaymentExpected: string | null;
  monthlyPayments: {
    month: string;
    count: number;
    total: string;
    downPayment: string;
    monthly: string;
    fullPayment: string;
  }[];
  payments: {
    id: string;
    kind: string;
    provider: string;
    amount: string;
    paidAt: string | null;
    invoiceNumber: string;
  }[];
  paymentSchedule: {
    id: string;
    amount: string;
    dueDate: string;
    paidAt: string | null;
    status: string;
  }[];
}
export interface CustomerResponse {
  records: CustomerRecord[];
  total: number;
  page: number;
  pageSize: number;
  metrics: { all: number; active: number; converted: number; overdue: number };
}
export const customerStatus: Record<string, string> = {
  ACTIVE: "Захиалгатай",
  CONVERTED: "Гэрээнд шилжсэн",
  CANCELLED: "Цуцлагдсан",
  EXPIRED: "Хугацаа дууссан",
};
