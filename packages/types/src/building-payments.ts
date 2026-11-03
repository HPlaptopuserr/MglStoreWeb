export interface BuildingPaymentMonth {
  month: number;
  year: number;
  expected: string;
  received: string;
  settled: string;
  outstanding: string;
  paymentCount: number;
}
export interface BuildingPaymentsReport {
  year: number;
  months: BuildingPaymentMonth[];
  previousDecember: BuildingPaymentMonth;
  totals: { expected: string; received: string; outstanding: string };
  undated: { count: number; amount: string };
  updatedAt: string;
}
