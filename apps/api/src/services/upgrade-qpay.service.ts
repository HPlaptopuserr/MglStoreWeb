import { calculatePlanExpiration } from "../lib/plan-expiration";
import type { QPayMerchantContext } from "./qpay.types";
import type { QPayPaymentCheckResponse } from "./qpay";

type UpgradePlanDuration = {
  id: string;
  durationDays: number;
};

const MONEY_TOLERANCE = 0.01;

export class UpgradeQPayConfigurationError extends Error {
  constructor(message = "Pro Upgrade QPay тохиргоо дутуу байна") {
    super(message);
    this.name = "UpgradeQPayConfigurationError";
  }
}

/**
 * Pro Upgrade always uses one server-owned merchant account. Organization or
 * POS-register merchant settings are intentionally never read here.
 *
 * Dedicated QPAY_UPGRADE_* values take priority. Existing platform QPAY_*
 * values remain a backwards-compatible fallback, but the two sets are never
 * mixed so a partially configured merchant cannot route payments incorrectly.
 */
export function resolveUpgradeQPayMerchantContext(
  source: NodeJS.ProcessEnv = process.env,
): QPayMerchantContext {
  const dedicated = {
    username: source.QPAY_UPGRADE_CLIENT_ID?.trim() || "",
    password: source.QPAY_UPGRADE_CLIENT_SECRET?.trim() || "",
    invoiceCode: source.QPAY_UPGRADE_INVOICE_CODE?.trim() || "",
  };
  const dedicatedRequested = Object.values(dedicated).some(Boolean);

  const selected = dedicatedRequested
    ? dedicated
    : {
        username: source.QPAY_CLIENT_ID?.trim() || "",
        password: source.QPAY_CLIENT_SECRET?.trim() || "",
        invoiceCode: source.QPAY_INVOICE_CODE?.trim() || "",
      };

  const missing = Object.entries(selected)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new UpgradeQPayConfigurationError(
      dedicatedRequested
        ? `QPAY_UPGRADE_* тохиргоо дутуу байна: ${missing.join(", ")}`
        : "QPAY_UPGRADE_* эсвэл платформын QPAY_* тохиргоог бүрэн оруулна уу",
    );
  }

  return {
    username: selected.username,
    password: selected.password,
    invoiceCode: selected.invoiceCode,
    merchantKey: `upgrade:${selected.username}:${selected.invoiceCode}`,
  };
}

export function isUpgradeQPayConfigured(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    resolveUpgradeQPayMerchantContext(source);
    return true;
  } catch {
    return false;
  }
}

/** A payment is accepted only when QPay reports enough settled PAID value. */
export function hasSufficientUpgradePayment(
  payment: QPayPaymentCheckResponse,
  expectedAmount: number,
): boolean {
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) return false;

  const paidRows = Array.isArray(payment.rows)
    ? payment.rows.filter(
        (row) => String(row.payment_status || "").toUpperCase() === "PAID",
      )
    : [];
  if (paidRows.length === 0) return false;

  const rowTotal = paidRows.reduce((sum, row) => {
    const amount = Number(row.payment_amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const reportedTotal = Number(payment.paid_amount);
  const settledAmount = Math.max(
    rowTotal,
    Number.isFinite(reportedTotal) ? reportedTotal : 0,
  );

  return settledAmount + MONEY_TOLERANCE >= expectedAmount;
}

/**
 * Expired access starts again now. An active subscription is extended from
 * its current expiry so paying early never discards already-paid days.
 */
export function calculateUpgradeRenewalExpiration(
  plan: UpgradePlanDuration,
  currentExpiresAt: Date | null | undefined,
  paidAt: Date,
): Date {
  const startsAt =
    currentExpiresAt && currentExpiresAt.getTime() > paidAt.getTime()
      ? currentExpiresAt
      : paidAt;
  return calculatePlanExpiration(plan, startsAt);
}
