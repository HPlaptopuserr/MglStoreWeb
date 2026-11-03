import { Prisma } from "@mgl/database";
import type {
  BuildingPaymentMonth,
  BuildingPaymentsReport,
} from "@mgl/types/building-payments";

const OFFSET = 8 * 3600000;
export const paymentMonthStart = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1) - OFFSET);
interface PaymentRecord {
  amount: { toString(): string };
  status: string;
  paidAt: Date | null;
}
interface ScheduleRecord {
  amount: { toString(): string };
  status: string;
  dueDate: Date;
}

/** Cash receipts belong to the payment date, independently of the schedule's due month. */
export function monthlyPaymentsReport(
  year: number,
  schedules: ScheduleRecord[],
  payments: PaymentRecord[],
  now = new Date(),
): BuildingPaymentsReport {
  const buckets = Array.from({ length: 13 }, (_, index) => ({
    year: index === 0 ? year - 1 : year,
    month: index === 0 ? 12 : index,
    expected: new Prisma.Decimal(0),
    received: new Prisma.Decimal(0),
    settled: new Prisma.Decimal(0),
    outstanding: new Prisma.Decimal(0),
    paymentCount: 0,
  }));
  function bucket(date: Date) {
    const local = new Date(date.getTime() + OFFSET);
    return buckets.find(
      (item) =>
        item.year === local.getUTCFullYear() &&
        item.month === local.getUTCMonth() + 1,
    );
  }
  for (const schedule of schedules) {
    if (schedule.status === "CANCELLED") continue;
    const item = bucket(schedule.dueDate);
    if (!item) continue;
    const amount = schedule.amount.toString();
    item.expected = item.expected.add(amount);
    if (schedule.status === "PAID") item.settled = item.settled.add(amount);
    else item.outstanding = item.outstanding.add(amount);
  }
  let undatedAmount = new Prisma.Decimal(0),
    undatedCount = 0;
  for (const payment of payments) {
    if (payment.status !== "PAID") continue;
    if (!payment.paidAt) {
      undatedCount++;
      undatedAmount = undatedAmount.add(payment.amount.toString());
      continue;
    }
    const item = bucket(payment.paidAt);
    if (item) {
      item.received = item.received.add(payment.amount.toString());
      item.paymentCount++;
    }
  }
  const serialize = (item: (typeof buckets)[number]): BuildingPaymentMonth => ({
    ...item,
    expected: item.expected.toString(),
    received: item.received.toString(),
    settled: item.settled.toString(),
    outstanding: item.outstanding.toString(),
  });
  const months = buckets.slice(1).map(serialize);
  const sum = (field: "expected" | "received" | "outstanding") =>
    months
      .reduce((total, item) => total.add(item[field]), new Prisma.Decimal(0))
      .toString();
  return {
    year,
    months,
    previousDecember: serialize(buckets[0]),
    totals: {
      expected: sum("expected"),
      received: sum("received"),
      outstanding: sum("outstanding"),
    },
    undated: { count: undatedCount, amount: undatedAmount.toString() },
    updatedAt: now.toISOString(),
  };
}
