import type { PaymentSearchMode } from "@mgl/types";
import { Prisma } from "@mgl/database";

export interface PaymentSearchInput {
  mode: PaymentSearchMode;
  reference: string;
  date: string;
  netAmount: string;
  feePercent: string;
  transferFee: string;
  page: number;
}

export class PaymentSearchInputError extends Error {}

function scalar(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string")
    throw new PaymentSearchInputError("Шүүлтүүрийн утга буруу байна");
  return value.trim();
}

function money(value: string, label: string): Prisma.Decimal {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(value)) {
    throw new PaymentSearchInputError(
      `${label}: эерэг дүн оруулна уу (бутархай 2 орон)`,
    );
  }
  return new Prisma.Decimal(value);
}

/** Closure references belong to a bank settlement, not an individual invoice. */
export function closureDate(reference: string): string | null {
  if (!/QR\s+ХААЛТ/iu.test(reference)) return null;
  const match = reference.match(/\b(20\d{2})[.\/-](\d{2})[.\/-](\d{2})\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function parsePaymentSearch(
  query: Record<string, unknown>,
): PaymentSearchInput {
  const reference = scalar(query.reference);
  if (reference.length > 1000)
    throw new PaymentSearchInputError(
      "Гүйлгээний утга 1000 тэмдэгтээс урт байна",
    );
  const mode = scalar(query.mode) || "reference";
  if (mode !== "reference" && mode !== "settlement")
    throw new PaymentSearchInputError("Хайлтын төрөл буруу байна");
  const date =
    scalar(query.date) ||
    (mode === "settlement" ? (closureDate(reference) ?? "") : "");
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)
  ) {
    throw new PaymentSearchInputError("Огноо буруу байна");
  }
  const pageText = scalar(query.page) || "1";
  if (!/^[1-9]\d{0,3}$/.test(pageText))
    throw new PaymentSearchInputError("Хуудасны дугаар буруу байна");
  const input: PaymentSearchInput = {
    mode,
    reference,
    date,
    page: Number(pageText),
    netAmount: scalar(query.netAmount),
    feePercent: scalar(query.feePercent) || "1",
    transferFee: scalar(query.transferFee) || "0",
  };
  if (mode === "reference") {
    if (reference.length < 3)
      throw new PaymentSearchInputError(
        "Лавлах дугаарын 3-аас доошгүй тэмдэгт оруулна уу",
      );
    if (closureDate(reference))
      throw new PaymentSearchInputError(
        "QR ХААЛТ утгыг «Хаалтын дүн тулгах» төрлөөр хайна уу",
      );
  } else {
    if (!date) throw new PaymentSearchInputError("QR хаалтын огноо оруулна уу");
    if (money(input.netAmount, "Орсон дүн").lte(0))
      throw new PaymentSearchInputError("Орсон дүн 0-ээс их байна");
    if (money(input.feePercent, "Шимтгэл").gte(100))
      throw new PaymentSearchInputError("Шимтгэл 100%-иас бага байна");
    money(input.transferFee, "Нэмэлт суутгал");
  }
  return input;
}

export function paymentSearchWhere(
  input: PaymentSearchInput,
): Prisma.PaymentAttemptWhereInput {
  const where: Prisma.PaymentAttemptWhereInput = { order: { deletedAt: null } };
  if (input.date) {
    // Bank closure dates are local calendar dates in Ulaanbaatar (UTC+08).
    const start = new Date(`${input.date}T00:00:00+08:00`);
    where.paidAt = { gte: start, lt: new Date(start.getTime() + 86_400_000) };
  }
  if (input.mode === "reference") {
    where.OR = [
      { providerRef: { contains: input.reference, mode: "insensitive" } },
      {
        order: {
          orderNumber: { contains: input.reference, mode: "insensitive" },
        },
      },
    ];
  } else {
    const net = new Prisma.Decimal(input.netAmount);
    const fee = new Prisma.Decimal(input.transferFee);
    const rate = new Prisma.Decimal(1).minus(
      new Prisma.Decimal(input.feePercent).div(100),
    );
    // Include every gross amount that rounds to the stated net, without float tolerances.
    where.amount = {
      gte: net.minus("0.005").plus(fee).div(rate),
      lt: net.plus("0.005").plus(fee).div(rate),
    };
    where.status = "PAID";
    where.method = "QPAY";
  }
  return where;
}

export function expectedNet(
  amount: Prisma.Decimal,
  input: PaymentSearchInput,
): string | null {
  if (input.mode !== "settlement") return null;
  return amount
    .mul(
      new Prisma.Decimal(1).minus(
        new Prisma.Decimal(input.feePercent).div(100),
      ),
    )
    .minus(input.transferFee)
    .toFixed(2);
}
