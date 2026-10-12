import { CashDrawerEventType, PosSaleStatus, type Prisma } from "@mgl/database";
import type { ShiftSaleAccountingInput } from "./shift-accounting";

type ShiftAccountingClient = Pick<
  Prisma.TransactionClient,
  "posSale" | "cardPaymentAttempt" | "qPayInvoice" | "posCashDrawerEvent"
>;

export async function loadShiftAccountingSales(
  client: ShiftAccountingClient,
  shiftIds: string[],
) {
  const result = new Map<string, ShiftSaleAccountingInput[]>();
  if (shiftIds.length === 0) return result;

  const sales = await client.posSale.findMany({
    where: {
      shiftId: { in: shiftIds },
      status: PosSaleStatus.COMPLETED,
    },
    select: {
      shiftId: true,
      receiptNo: true,
      grandTotal: true,
      paymentMethod: true,
      paymentBreakdown: true,
      loyalty: { select: { redeemedPoints: true } },
      creditSale: { select: { principalAmount: true } },
    },
  });

  const receiptNumbers = sales.map((sale) => sale.receiptNo);
  const [cardAttempts, qpayInvoices] = receiptNumbers.length
    ? await Promise.all([
        client.cardPaymentAttempt.findMany({
          where: { saleReference: { in: receiptNumbers } },
          select: { saleReference: true, amount: true },
        }),
        client.qPayInvoice.findMany({
          where: { saleReference: { in: receiptNumbers } },
          select: { saleReference: true, amount: true },
        }),
      ])
    : [[], []];

  const cardByReceipt = new Map<string, number[]>();
  for (const attempt of cardAttempts) {
    const key = attempt.saleReference || "";
    cardByReceipt.set(key, [
      ...(cardByReceipt.get(key) || []),
      Number(attempt.amount),
    ]);
  }
  const qpayByReceipt = new Map<string, number[]>();
  for (const invoice of qpayInvoices) {
    const key = invoice.saleReference || "";
    qpayByReceipt.set(key, [
      ...(qpayByReceipt.get(key) || []),
      Number(invoice.amount),
    ]);
  }

  for (const sale of sales) {
    const accountingSale: ShiftSaleAccountingInput = {
      grandTotal: Number(sale.grandTotal),
      paymentMethod: sale.paymentMethod,
      paymentBreakdown: sale.paymentBreakdown,
      redeemedPoints: sale.loyalty?.redeemedPoints || 0,
      cardPayments: cardByReceipt.get(sale.receiptNo) || [],
      qpayPayments: qpayByReceipt.get(sale.receiptNo) || [],
      creditAmount: Number(sale.creditSale?.principalAmount || 0),
    };
    result.set(sale.shiftId, [
      ...(result.get(sale.shiftId) || []),
      accountingSale,
    ]);
  }

  return result;
}

export async function getCashDrawerEventTotals(
  client: Pick<Prisma.TransactionClient, "posCashDrawerEvent">,
  shiftId: string,
) {
  const events = await client.posCashDrawerEvent.findMany({
    where: { shiftId },
    select: { type: true, amount: true },
  });
  return events.reduce<{ paidIn: number; paidOut: number }>(
    (summary, event) => {
      const amount = Number(event.amount);
      if (!Number.isFinite(amount)) return summary;
      if (event.type === CashDrawerEventType.PAID_IN) summary.paidIn += amount;
      if (event.type === CashDrawerEventType.PAID_OUT)
        summary.paidOut += amount;
      return summary;
    },
    { paidIn: 0, paidOut: 0 },
  );
}
