import { CashDrawerEventType, ShiftStatus, type Prisma } from "@mgl/database";
import { randomUUID } from "node:crypto";
import { toApiError } from "./_shared";
import { canClosePosShift, type ShiftAccessActor } from "./shift-access";
import {
  calculateExpectedCash,
  roundShiftMoney,
  summarizeShiftSales,
} from "./shift-accounting";
import {
  getCashDrawerEventTotals,
  loadShiftAccountingSales,
} from "./shift-accounting-data";

interface MovementInput {
  shiftId?: unknown;
  type?: unknown;
  amount?: unknown;
  note?: unknown;
  requestId?: unknown;
}

interface CashDrawerMovement {
  shiftId: string;
  type: CashDrawerEventType;
  amount: number;
  note: string | null;
  requestId: string | undefined;
}

export function parseCashDrawerMovement(
  input: MovementInput,
): CashDrawerMovement {
  const shiftId = typeof input.shiftId === "string" ? input.shiftId.trim() : "";
  const type = String(input.type ?? "")
    .trim()
    .toUpperCase();
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const requestId = input.requestId;
  if (!shiftId) throw toApiError(400, "Ээлжийн ID шаардлагатай");
  if (type !== "PAID_IN" && type !== "PAID_OUT" && type !== "OPEN_DRAWER") {
    throw toApiError(400, "Хөдөлгөөний төрөл буруу байна");
  }
  const amount = type === "OPEN_DRAWER" ? 0 : input.amount;
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    (type !== "OPEN_DRAWER" && amount <= 0) ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.abs(amount - roundShiftMoney(amount)) > 0.00000001
  ) {
    throw toApiError(
      400,
      "Дүн 0-оос их, бутархай нь 2 орноос хэтрэхгүй байх ёстой",
    );
  }
  if (note.length > 500)
    throw toApiError(400, "Тайлбар 500 тэмдэгтээс хэтрэхгүй байна");
  if (type === "PAID_OUT" && !note) {
    throw toApiError(400, "Зарлагын зориулалт, хэнд төлснийг бичнэ үү");
  }
  if (
    requestId !== undefined &&
    (typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        requestId,
      ))
  ) {
    throw toApiError(400, "Хүсэлтийн ID буруу байна");
  }
  return {
    shiftId,
    type,
    amount: roundShiftMoney(amount),
    note: note || null,
    requestId,
  };
}

export async function recordCashDrawerMovement(
  tx: Prisma.TransactionClient,
  actor: ShiftAccessActor,
  movement: ReturnType<typeof parseCashDrawerMovement>,
  organizationId?: string,
) {
  // Sales and shift closure use this same lock. Recheck status and balance only
  // after acquiring it so concurrent withdrawals cannot spend the same cash.
  await tx.$queryRaw`SELECT "id" FROM "PosShift" WHERE "id" = ${movement.shiftId} FOR UPDATE`;
  const shift = await tx.posShift.findUnique({
    where: { id: movement.shiftId },
  });
  if (!shift) throw toApiError(404, "Ээлж олдсонгүй");
  // Drawer movements have the same ownership policy as shift reconciliation.
  if (!canClosePosShift(actor, shift))
    throw toApiError(403, "Энэ шургуулга дээр хөдөлгөөн хийх эрхгүй");

  if (organizationId && shift.organizationId !== organizationId) {
    throw toApiError(400, "Ээлж байгууллага зөрүүтэй байна");
  }

  if (movement.requestId) {
    const existing = await tx.posCashDrawerEvent.findUnique({
      where: { id: movement.requestId },
    });
    if (existing) {
      if (
        existing.shiftId !== shift.id ||
        existing.cashierId !== actor.id ||
        existing.type !== movement.type ||
        Number(existing.amount) !== movement.amount ||
        existing.note !== movement.note
      ) {
        throw toApiError(409, "Хүсэлтийн ID өөр хөдөлгөөнд ашиглагдсан байна");
      }
      return existing;
    }
  }
  if (shift.status !== ShiftStatus.OPEN) {
    throw toApiError(
      409,
      "Хаагдсан ээлж дээр шургуулгын хөдөлгөөн хийх боломжгүй",
    );
  }
  if (movement.type === CashDrawerEventType.PAID_OUT) {
    const [sales, totals] = await Promise.all([
      loadShiftAccountingSales(tx, [shift.id]),
      getCashDrawerEventTotals(tx, shift.id),
    ]);
    const expectedCash = calculateExpectedCash({
      openingCash: Number(shift.openingCash),
      cashSales: summarizeShiftSales(sales.get(shift.id) ?? []).cashSales,
      ...totals,
    });
    if (movement.amount > expectedCash) {
      throw toApiError(
        409,
        "Зарлагын дүн кассын тооцоолсон бэлэн үлдэгдлээс их байна",
      );
    }
  }
  return tx.posCashDrawerEvent.create({
    data: {
      id: movement.requestId ?? randomUUID(),
      organizationId: shift.organizationId,
      branchId: shift.branchId,
      registerId: shift.registerId,
      shiftId: shift.id,
      cashierId: actor.id,
      type: movement.type,
      amount: movement.amount,
      note: movement.note,
    },
  });
}
