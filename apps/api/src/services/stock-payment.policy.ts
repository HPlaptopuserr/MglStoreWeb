import { PaymentMethod, StockRequestStatus, type Prisma } from "@mgl/database";

export function canPayApprovedStockRequest(status: StockRequestStatus) {
  return (
    status === StockRequestStatus.APPROVED ||
    status === StockRequestStatus.PROCESSING
  );
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    Object.values(PaymentMethod).includes(value as PaymentMethod)
  );
}

type PaymentConfirmationInput = {
  paidAmount: unknown;
  currentPaidAmount: Prisma.Decimal | number | string;
  totalAmount: Prisma.Decimal | number | string;
};

export type PaymentConfirmationResult =
  | {
      ok: true;
      paidAmount: number;
      fullyPaid: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export function validatePaymentConfirmation({
  paidAmount,
  currentPaidAmount,
  totalAmount,
}: PaymentConfirmationInput): PaymentConfirmationResult {
  const total = Number(totalAmount);
  const current = Number(currentPaidAmount);
  const confirmed = Number(paidAmount ?? totalAmount);

  if (![total, current, confirmed].every(Number.isFinite) || total <= 0) {
    return { ok: false, message: "Төлбөрийн дүнгийн мэдээлэл буруу байна" };
  }

  if (confirmed <= 0 || confirmed < current || confirmed > total) {
    return {
      ok: false,
      message:
        "Төлсөн нийт дүн өмнөх төлөлтөөс багагүй, нийт дүнгээс хэтрэхгүй байна",
    };
  }

  return {
    ok: true,
    paidAmount: confirmed,
    fullyPaid: confirmed >= total,
  };
}
