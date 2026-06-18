export type ShiftPaymentMethod = "CASH" | "CARD" | "QPAY" | "CREDIT" | "MIXED";

export type ShiftPaymentAmount = {
  method: ShiftPaymentMethod;
  amount: number;
};

export type ShiftSaleAccountingInput = {
  grandTotal: number;
  paymentMethod: string | null;
  paymentBreakdown?: unknown;
  redeemedPoints?: number;
  cardPayments?: number[];
  qpayPayments?: number[];
  creditAmount?: number;
};

const MONEY_EPSILON = 0.01;

export const roundShiftMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeMethod = (value: unknown): ShiftPaymentMethod | null => {
  const method = String(value || "").trim().toUpperCase();
  if (method === "QR") return "QPAY";
  if (
    method === "CASH" ||
    method === "CARD" ||
    method === "QPAY" ||
    method === "CREDIT" ||
    method === "MIXED"
  ) {
    return method;
  }
  return null;
};

export const normalizeStoredPaymentBreakdown = (value: unknown): ShiftPaymentAmount[] => {
  if (!Array.isArray(value)) return [];

  const payments: ShiftPaymentAmount[] = [];
  for (const item of value) {
    const source = item as Record<string, unknown>;
    const method = normalizeMethod(source.method);
    const amount = roundShiftMoney(Number(source.amount));
    if (!method || method === "MIXED" || !Number.isFinite(amount) || amount <= 0) {
      continue;
    }
    payments.push({ method, amount });
  }
  return payments;
};

export const resolveSalePayments = (
  sale: ShiftSaleAccountingInput,
): ShiftPaymentAmount[] => {
  const stored = normalizeStoredPaymentBreakdown(sale.paymentBreakdown);
  if (stored.length > 0) return stored;

  const payableTotal = roundShiftMoney(
    Math.max(0, Number(sale.grandTotal || 0) - Number(sale.redeemedPoints || 0)),
  );
  const method = normalizeMethod(sale.paymentMethod);
  if (payableTotal <= 0 || !method) return [];

  if (method !== "MIXED") {
    return [{ method, amount: payableTotal }];
  }

  const payments: ShiftPaymentAmount[] = [];
  for (const amount of sale.cardPayments || []) {
    const normalized = roundShiftMoney(Number(amount));
    if (Number.isFinite(normalized) && normalized > 0) {
      payments.push({ method: "CARD", amount: normalized });
    }
  }
  for (const amount of sale.qpayPayments || []) {
    const normalized = roundShiftMoney(Number(amount));
    if (Number.isFinite(normalized) && normalized > 0) {
      payments.push({ method: "QPAY", amount: normalized });
    }
  }

  const creditAmount = roundShiftMoney(Number(sale.creditAmount || 0));
  if (Number.isFinite(creditAmount) && creditAmount > 0) {
    payments.push({ method: "CREDIT", amount: creditAmount });
  }

  const knownTotal = roundShiftMoney(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const cashRemainder = roundShiftMoney(payableTotal - knownTotal);
  if (cashRemainder > MONEY_EPSILON) {
    payments.push({ method: "CASH", amount: cashRemainder });
  }

  return payments.length > 0
    ? payments
    : [{ method: "MIXED", amount: payableTotal }];
};

export const summarizeShiftSales = (sales: ShiftSaleAccountingInput[]) => {
  const summary = {
    salesCount: sales.length,
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    qpaySales: 0,
    creditSales: 0,
    mixedSales: 0,
  };

  for (const sale of sales) {
    const total = Number(sale.grandTotal);
    if (Number.isFinite(total)) summary.totalSales += total;

    const payments = resolveSalePayments(sale);
    if (payments.length > 1 || normalizeMethod(sale.paymentMethod) === "MIXED") {
      summary.mixedSales += Number.isFinite(total) ? total : 0;
    }

    for (const payment of payments) {
      if (payment.method === "CASH") summary.cashSales += payment.amount;
      if (payment.method === "CARD") summary.cardSales += payment.amount;
      if (payment.method === "QPAY") summary.qpaySales += payment.amount;
      if (payment.method === "CREDIT") summary.creditSales += payment.amount;
    }
  }

  return {
    salesCount: summary.salesCount,
    totalSales: roundShiftMoney(summary.totalSales),
    cashSales: roundShiftMoney(summary.cashSales),
    cardSales: roundShiftMoney(summary.cardSales),
    qpaySales: roundShiftMoney(summary.qpaySales),
    creditSales: roundShiftMoney(summary.creditSales),
    mixedSales: roundShiftMoney(summary.mixedSales),
  };
};

export const calculateExpectedCash = ({
  openingCash,
  cashSales,
  paidIn,
  paidOut,
}: {
  openingCash: number;
  cashSales: number;
  paidIn: number;
  paidOut: number;
}) => roundShiftMoney(openingCash + cashSales + paidIn - paidOut);
