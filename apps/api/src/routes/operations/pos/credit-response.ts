import { calculatePosCreditPayable } from "./credit-interest";

export const mapCreditSaleResponse = (creditSale: {
  id: string;
  customerId: string | null;
  status: string;
  targetType: string;
  borrowerId: string;
  borrowerUserId?: string | null;
  borrowerName: string;
  borrowerPhone: string | null;
  borrowerEmail?: string | null;
  borrowerAddress?: string | null;
  employeeId: string | null;
  employeeName: string | null;
  principalAmount: unknown;
  monthlyInterestRate: unknown;
  totalInterest: unknown;
  totalDue: unknown;
  termMonths: number;
  dueDate: Date | null;
  createdAt?: Date | null;
  paidAt?: Date | null;
  paidAmount?: unknown;
  paymentMethod?: string | null;
  paymentNote?: string | null;
}) => {
  const payable = calculatePosCreditPayable(creditSale);

  return {
    id: creditSale.id,
    customerId: creditSale.customerId,
    status: creditSale.status,
    targetType: creditSale.targetType,
    borrowerId: creditSale.borrowerId,
    borrowerUserId: creditSale.borrowerUserId ?? null,
    borrowerName: creditSale.borrowerName,
    borrowerPhone: creditSale.borrowerPhone,
    borrowerEmail: creditSale.borrowerEmail ?? null,
    borrowerAddress: creditSale.borrowerAddress ?? null,
    employeeId: creditSale.employeeId,
    employeeName: creditSale.employeeName,
    principalAmount: payable.principalAmount,
    monthlyInterestRate: payable.monthlyInterestRate,
    totalInterest: payable.totalInterest,
    totalDue:
      creditSale.status === "PAID" ? payable.totalDue : payable.remainingDue,
    remainingDue: creditSale.status === "PAID" ? 0 : payable.remainingDue,
    termMonths: creditSale.termMonths,
    dueDate: payable.dueDate?.toISOString() ?? null,
    paidAt: creditSale.paidAt?.toISOString() ?? null,
    paidAmount:
      creditSale.paidAmount == null ? null : Number(creditSale.paidAmount),
    paymentMethod: creditSale.paymentMethod ?? null,
    paymentNote: creditSale.paymentNote ?? null,
  };
};
