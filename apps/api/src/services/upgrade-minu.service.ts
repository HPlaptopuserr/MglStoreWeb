import { calculatePlanExpiration } from "../lib/plan-expiration";
import type { QPayPaymentCheckResponse } from "./qpay";

type UpgradePlanDuration = {
  id: string;
  durationDays: number;
};

const MONEY_TOLERANCE = 0.01;

export const UPGRADE_PAYMENT_ACCOUNT_SETTING_KEY =
  "pro-upgrade-payment-account";
export const CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY =
  "contract-payment-accounts";

export type UpgradeMinuMerchantConfig = {
  merchantCode: string;
  username: string;
  password: string;
};

export type UpgradeMinuPaymentAccount = {
  id: string;
  merchantCode: string;
  username: string;
  password: string;
};

export class UpgradeMinuConfigurationError extends Error {
  constructor(message = "Pro Upgrade Minu Dynamic QR тохиргоо дутуу байна") {
    super(message);
    this.name = "UpgradeMinuConfigurationError";
  }
}

/**
 * Upgrade payments always use one server-owned Minu merchant. Organization and
 * POS-register merchant settings are intentionally never read here.
 */
export function resolveUpgradeMinuMerchantConfig(
  source: NodeJS.ProcessEnv = process.env,
  merchantCodeOverride = "",
): UpgradeMinuMerchantConfig {
  const dedicatedUsername = source.SYSTEMQR_UPGRADE_USERNAME?.trim() || "";
  const dedicatedPassword = source.SYSTEMQR_UPGRADE_PASSWORD?.trim() || "";
  const dedicatedAuthRequested = Boolean(
    dedicatedUsername || dedicatedPassword,
  );
  if (dedicatedAuthRequested && (!dedicatedUsername || !dedicatedPassword)) {
    throw new UpgradeMinuConfigurationError(
      "SYSTEMQR_UPGRADE_USERNAME болон SYSTEMQR_UPGRADE_PASSWORD-ийг хамтад нь тохируулна уу",
    );
  }

  const username = dedicatedAuthRequested
    ? dedicatedUsername
    : source.SYSTEMQR_USERNAME?.trim() || "";
  const password = dedicatedAuthRequested
    ? dedicatedPassword
    : source.SYSTEMQR_PASSWORD?.trim() || "";
  const merchantCode = merchantCodeOverride.trim();

  if (!merchantCode || !username || !password) {
    throw new UpgradeMinuConfigurationError(
      "SYSTEMQR_UPGRADE_MERCHANT_CODE болон Minu нэвтрэх эрхийг сервер дээр тохируулна уу",
    );
  }

  const masterUsername = source.SYSTEMQR_USERNAME?.trim() || "";
  if (
    masterUsername &&
    merchantCode.toLowerCase() === masterUsername.toLowerCase()
  ) {
    throw new UpgradeMinuConfigurationError(
      "Pro Upgrade-д Minu master username биш, Admin дээр бүртгэсэн subMerchant данс сонгоно уу",
    );
  }

  return { merchantCode, username, password };
}

export function resolveUpgradeMerchantCodeFromSettings(
  selectionValue: string | null | undefined,
  paymentAccountsValue: string | null | undefined,
): string {
  return (
    resolveUpgradePaymentAccountFromSettings(
      selectionValue,
      paymentAccountsValue,
    )?.merchantCode || ""
  );
}

export function readMinuPaymentAccounts(
  paymentAccountsValue: string | null | undefined,
): UpgradeMinuPaymentAccount[] {
  if (!paymentAccountsValue) return [];

  try {
    const accounts = JSON.parse(paymentAccountsValue) as unknown;
    if (!Array.isArray(accounts)) return [];

    return accounts.flatMap((account) => {
      if (!account || typeof account !== "object") return [];
      const record = account as Record<string, unknown>;
      const id = String(record.id || "").trim();
      const merchantCode = String(record.merchantCode || "").trim();
      if (!id || !merchantCode) return [];

      return [
        {
          id,
          merchantCode,
          username: String(record.username || merchantCode).trim(),
          password: String(record.password || "").trim(),
        },
      ];
    });
  } catch {
    return [];
  }
}

export function findUpgradePaymentAccountByMerchantCode(
  paymentAccountsValue: string | null | undefined,
  merchantCode: string,
): UpgradeMinuPaymentAccount | null {
  const expectedCode = merchantCode.trim().toLowerCase();
  if (!expectedCode) return null;

  return (
    readMinuPaymentAccounts(paymentAccountsValue).find(
      (account) => account.merchantCode.toLowerCase() === expectedCode,
    ) || null
  );
}

export function resolveUpgradePaymentAccountFromSettings(
  selectionValue: string | null | undefined,
  paymentAccountsValue: string | null | undefined,
): UpgradeMinuPaymentAccount | null {
  if (!selectionValue || !paymentAccountsValue) return null;

  try {
    const selection = JSON.parse(selectionValue) as { accountId?: unknown };
    const accountId =
      typeof selection?.accountId === "string"
        ? selection.accountId.trim()
        : "";
    if (!accountId) return null;

    return (
      readMinuPaymentAccounts(paymentAccountsValue).find(
        (account) => account.id === accountId,
      ) || null
    );
  } catch {
    return null;
  }
}

export function buildUpgradeMinuWebhookUrl(
  invoiceNo: string,
  organizationId: string,
  source: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const publicUrl = (source.API_PUBLIC_URL || source.API_URL || "").trim();
  if (!publicUrl) return undefined;

  try {
    const webhook = new URL("/api/vendor/upgrade/callback", publicUrl);
    webhook.searchParams.set("orgId", organizationId);
    webhook.searchParams.set("invoiceNo", invoiceNo);
    return webhook.toString();
  } catch {
    return undefined;
  }
}

/** Existing pending QPay invoices remain verifiable during the migration. */
export function hasSufficientLegacyQPayPayment(
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
