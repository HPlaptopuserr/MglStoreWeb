import type {
  WarehouseDispatchPaymentMethod,
  WarehouseDispatchPaymentStatus,
} from "@mgl/types";

export const dispatchPaymentMethods = [
  { value: "CASH", label: "Бэлэн" },
  { value: "BANK_TRANSFER", label: "Банкны шилжүүлэг" },
  { value: "CARD", label: "Карт" },
  { value: "QPAY", label: "QPay" },
  { value: "OTHER", label: "Бусад" },
] as const satisfies ReadonlyArray<{
  value: WarehouseDispatchPaymentMethod;
  label: string;
}>;

export function dispatchPaymentLabel(
  status: WarehouseDispatchPaymentStatus | null | "" | undefined,
  method: WarehouseDispatchPaymentMethod | null | "" | undefined,
): string {
  if (status === "CREDIT") return "Зээлээр";
  if (status !== "PAID") return "Тэмдэглээгүй";
  const label = dispatchPaymentMethods.find(
    (item) => item.value === method,
  )?.label;
  return label ? `Төлсөн · ${label}` : "Төлсөн";
}
