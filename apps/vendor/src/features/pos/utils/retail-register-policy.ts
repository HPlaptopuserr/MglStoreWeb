import type { PosShift, RegisterConfig } from "@mgl/types";

type RegisterContext = Pick<
  RegisterConfig,
  "id" | "name" | "mode" | "organizationId" | "branchId" | "isActive"
>;
type ShiftContext = Pick<
  PosShift,
  "id" | "mode" | "status" | "organizationId" | "branchId" | "registerId"
>;

export function assertRetailRegister(register: RegisterContext): void {
  if (register.mode !== "RETAIL") {
    throw new Error(
      `«${register.name}» нь ${register.mode === "RESTAURANT" ? "рестораны" : "өөртөө үйлчлэх"} кассаар тохируулагдсан байна. Дэлгүүрийн касс сонгоно уу.`,
    );
  }
}

export function assertRetailCheckoutContext(
  register: RegisterContext,
  shift: ShiftContext,
  organizationId: string,
): void {
  assertRetailRegister(register);
  if (!register.isActive) throw new Error("Касс идэвхгүй байна.");
  if (
    register.organizationId !== organizationId ||
    shift.organizationId !== organizationId ||
    register.branchId !== shift.branchId
  ) {
    throw new Error("Касс, салбар, ээлжийн харьяалал зөрсөн байна.");
  }
  if (
    shift.mode !== "RETAIL" ||
    shift.status !== "OPEN" ||
    (shift.registerId && shift.registerId !== register.id)
  ) {
    throw new Error(
      "Дэлгүүрийн энэ кассанд нээлттэй ээлж шаардлагатай. Ээлжээ шалгана уу.",
    );
  }
}
