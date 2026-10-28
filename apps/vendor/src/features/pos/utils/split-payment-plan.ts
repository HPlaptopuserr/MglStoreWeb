import { parseCashReceivedAmount } from "@mgl/types";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";

export const SPLIT_METHODS = ["CARD", "QR", "CASH"] as const;
export const SPLIT_PAYMENT_LABELS = {
  CARD: "Карт",
  QR: "QR",
  CASH: "Бэлэн",
} as const;
export type SplitPaymentMethod = (typeof SPLIT_METHODS)[number];
export interface SplitPaymentDraft {
  amounts: Record<SplitPaymentMethod, string>;
  remainderMethod: SplitPaymentMethod | null;
}
export interface SplitPaymentPlan {
  amounts: Record<SplitPaymentMethod, number>;
  locked: Record<SplitPaymentMethod, boolean>;
  statuses: Record<SplitPaymentMethod, "confirmed" | "pending" | "draft">;
  errors: Partial<Record<SplitPaymentMethod, string>>;
  allocated: number;
  unallocated: number;
  error: string;
  nextMethod: SplitPaymentMethod | null;
}
export const createSplitPaymentDraft = (): SplitPaymentDraft => ({
  amounts: { CARD: "", QR: "", CASH: "" },
  remainderMethod: "QR",
});

/** Allocate in minor units. Existing payment evidence always overrides editable inputs. */
export function resolveSplitPaymentPlan(
  total: number,
  draft: SplitPaymentDraft,
  entries: CheckoutPaymentEntry[],
): SplitPaymentPlan {
  const cents: Record<SplitPaymentMethod, number> = { CARD: 0, QR: 0, CASH: 0 };
  const locked: SplitPaymentPlan["locked"] = {
    CARD: false,
    QR: false,
    CASH: false,
  };
  const statuses: SplitPaymentPlan["statuses"] = {
    CARD: "draft",
    QR: "draft",
    CASH: "draft",
  };
  const errors: SplitPaymentPlan["errors"] = {};
  for (const method of SPLIT_METHODS) {
    const existing = entries.filter((entry) => entry.method === method);
    locked[method] = existing.length > 0;
    if (existing.length) {
      cents[method] = existing.reduce(
        (sum, entry) => sum + Math.round(entry.amount * 100),
        0,
      );
      statuses[method] = existing.some((entry) => entry.status === "pending")
        ? "pending"
        : "confirmed";
    } else if (method !== draft.remainderMethod) {
      try {
        cents[method] = Math.round(
          parseCashReceivedAmount(draft.amounts[method].trim() || "0") * 100,
        );
      } catch {
        errors[method] =
          "Дүнгээ 0 буюу түүнээс их тоогоор, хоёр хүртэл бутархай оронтой оруулна уу.";
      }
    }
  }
  const totalCents = Math.round(total * 100);
  const remainder = draft.remainderMethod;
  if (remainder && !locked[remainder])
    cents[remainder] = Math.max(
      0,
      totalCents -
        SPLIT_METHODS.reduce((sum, method) => sum + cents[method], 0),
    );
  const allocated = SPLIT_METHODS.reduce(
    (sum, method) => sum + cents[method],
    0,
  );
  let error = "";
  if (!Number.isFinite(total) || totalCents <= 0)
    error = "Төлөх нийт дүн 0-оос их байх ёстой.";
  else if (entries.some((entry) => entry.method === "CREDIT"))
    error = "Зээлийн төлбөрийг энэ хуваарилалтад нэгтгэх боломжгүй.";
  else if (Object.keys(errors).length) error = "Оруулсан дүнгээ шалгана уу.";
  else if (allocated > totalCents)
    error = "Хуваарилсан дүн нийт төлбөрөөс их байна.";
  else if (allocated < totalCents)
    error =
      "Үлдсэн дүнгээ хуваарилах эсвэл нэг мөрөнд “Үлдэгдэл бүтнээр” сонгоно уу.";
  return {
    amounts: {
      CARD: cents.CARD / 100,
      QR: cents.QR / 100,
      CASH: cents.CASH / 100,
    },
    locked,
    statuses,
    errors,
    allocated: allocated / 100,
    unallocated: (totalCents - allocated) / 100,
    error,
    nextMethod: error
      ? null
      : (SPLIT_METHODS.find((method) => cents[method] > 0 && !locked[method]) ??
        null),
  };
}
