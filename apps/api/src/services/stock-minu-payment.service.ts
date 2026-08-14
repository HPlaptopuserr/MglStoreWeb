import { prisma } from "@mgl/database";
import {
  CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
  findUpgradePaymentAccountByMerchantCode,
  resolveUpgradePaymentAccountFromSettings,
  type UpgradeMinuPaymentAccount,
} from "./upgrade-minu.service";

export class StockMinuConfigurationError extends Error {
  constructor(
    message = "Агуулахын төлбөр хүлээн авах Minu Dynamic QR данс сонгогдоогүй байна",
  ) {
    super(message);
    this.name = "StockMinuConfigurationError";
  }
}

const MINU_MERCHANT_NOTE_PREFIX = "SYSTEMQR_MERCHANT:";

export function stockMinuPaymentNote(merchantCode: string): string {
  return `${MINU_MERCHANT_NOTE_PREFIX}${merchantCode.trim()}`;
}

function merchantCodeFromNote(note?: string | null): string {
  const value = String(note || "").trim();
  return value.startsWith(MINU_MERCHANT_NOTE_PREFIX)
    ? value.slice(MINU_MERCHANT_NOTE_PREFIX.length).trim()
    : "";
}

/**
 * Stock-request and representative collections use the platform-owned Minu
 * account explicitly selected for that warehouse. Vendor/POS merchant
 * settings are not consulted because the warehouse is the payment recipient.
 */
export async function getStockMinuPaymentAccount(
  warehouseId: string,
  transactionId?: string,
): Promise<UpgradeMinuPaymentAccount> {
  const [paymentAccountsSetting, warehouse] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { key: CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY },
      select: { value: true },
    }),
    prisma.warehouse.findFirst({
      where: { id: warehouseId, deletedAt: null, isActive: true },
      select: { paymentAccountId: true },
    }),
  ]);
  const paymentAccountsValue = paymentAccountsSetting?.value;
  const entry = transactionId
    ? await prisma.stockRequestPaymentEntry.findUnique({
        where: { transactionId },
        select: { note: true },
      })
    : null;
  const originalMerchantCode = merchantCodeFromNote(entry?.note);
  const account = originalMerchantCode
    ? findUpgradePaymentAccountByMerchantCode(
        paymentAccountsValue,
        originalMerchantCode,
      )
    : resolveUpgradePaymentAccountFromSettings(
        warehouse?.paymentAccountId
          ? JSON.stringify({ accountId: warehouse.paymentAccountId })
          : null,
        paymentAccountsValue,
      );

  if (!account?.merchantCode || !account.username || !account.password) {
    throw new StockMinuConfigurationError(
      "Энэ агуулахад төлбөр хүлээн авах Minu Dynamic QR данс сонгоогүй байна",
    );
  }
  return account;
}
