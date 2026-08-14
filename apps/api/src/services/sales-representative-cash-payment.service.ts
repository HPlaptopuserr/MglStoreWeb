import { PaymentMethod, PaymentStatus, Prisma, prisma } from "@mgl/database";

export type PartialPaymentState = {
  id: string;
  status: PaymentStatus;
  totalAmount: Prisma.Decimal | number | string;
  paidAmount: Prisma.Decimal | number | string;
};

export type PartialPaymentValidation =
  | { ok: true; amount: number; outstandingBefore: number; fullyPaid: boolean }
  | { ok: false; status: 400 | 409; message: string };

export function validatePartialPaymentAmount(
  payment: PartialPaymentState,
  requestedAmount: unknown,
): PartialPaymentValidation {
  if (payment.status === PaymentStatus.CANCELLED)
    return { ok: false, status: 409, message: "Төлбөр цуцлагдсан байна" };

  const total = Number(payment.totalAmount);
  const paid = Number(payment.paidAmount);
  const amount = Number(requestedAmount);
  const outstandingBefore = total - paid;
  if (![total, paid, amount, outstandingBefore].every(Number.isFinite))
    return { ok: false, status: 400, message: "Төлбөрийн дүн буруу байна" };
  if (outstandingBefore <= 0 || payment.status === PaymentStatus.PAID)
    return { ok: false, status: 409, message: "Төлөх үлдэгдэлгүй байна" };
  if (amount <= 0 || !Number.isInteger(amount))
    return {
      ok: false,
      status: 400,
      message: "Төлөх дүн 0-ээс их бүхэл төгрөг байна",
    };
  if (amount > outstandingBefore)
    return {
      ok: false,
      status: 400,
      message: `Төлөх дүн үлдэгдэл ${outstandingBefore.toLocaleString("en-US")}₮-өөс хэтэрч болохгүй`,
    };
  return {
    ok: true,
    amount,
    outstandingBefore,
    fullyPaid: amount === outstandingBefore,
  };
}

type ConfirmCashPaymentInput = {
  paymentId: string;
  amount: number;
  actorUserId: string;
  idempotencyKey: string;
  note?: string;
};

export async function confirmRepresentativeCashPayment({
  paymentId,
  amount,
  actorUserId,
  idempotencyKey,
  note,
}: ConfirmCashPaymentInput) {
  const transactionId = `CASH-${idempotencyKey}`;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.stockRequestPaymentEntry.findUnique({
      where: { transactionId },
    });
    if (existing) {
      if (existing.paymentId !== paymentId || Number(existing.amount) !== amount)
        throw new Error("IDEMPOTENCY_KEY_CONFLICT");
      const current = await tx.stockRequestPayment.findUniqueOrThrow({
        where: { id: paymentId },
      });
      return {
        amount: Number(existing.amount),
        paidAmount: Number(current.paidAmount),
        outstandingAmount: Math.max(
          0,
          Number(current.totalAmount) - Number(current.paidAmount),
        ),
        status: current.status,
        alreadyConfirmed: true,
      };
    }

    const current = await tx.stockRequestPayment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    const validation = validatePartialPaymentAmount(current, amount);
    if (!validation.ok) throw new Error(`PAYMENT_VALIDATION:${validation.message}`);

    const nextPaidAmount = Number(current.paidAmount) + validation.amount;
    const confirmedAt = new Date();
    const updated = await tx.stockRequestPayment.updateMany({
      where: { id: paymentId, paidAmount: current.paidAmount },
      data: {
        paidAmount: nextPaidAmount,
        status: validation.fullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paidAt: validation.fullyPaid ? confirmedAt : null,
        paymentMethod: PaymentMethod.CASH,
        confirmedById: actorUserId,
        confirmedAt,
        note: note?.trim() || "Худалдааны төлөөлөгч бэлэн төлбөр хүлээн авсан",
      },
    });
    if (updated.count !== 1) throw new Error("PAYMENT_BALANCE_CHANGED");

    await tx.stockRequestPaymentEntry.create({
      data: {
        paymentId,
        amount: validation.amount,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        transactionId,
        confirmedById: actorUserId,
        confirmedAt,
        note: note?.trim() || "Бэлэн төлбөр",
      },
    });
    return {
      amount: validation.amount,
      paidAmount: nextPaidAmount,
      outstandingAmount: validation.outstandingBefore - validation.amount,
      status: validation.fullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
      alreadyConfirmed: false,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
