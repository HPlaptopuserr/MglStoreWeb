import { prisma } from "@mgl/database";
import {
  CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
  findUpgradePaymentAccountByMerchantCode,
  resolveUpgradePaymentAccountFromSettings,
  type UpgradeMinuPaymentAccount,
} from "./upgrade-minu.service";

export const STOCK_PAYMENT_ACCOUNT_SETTING_KEY =
  "stock-request-payment-account";

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
 * account explicitly selected by Admin. Vendor/POS merchant settings are not
 * consulted because the warehouse is the payment recipient.
 */
export async function getStockMinuPaymentAccount(
  transactionId?: string,
): Promise<UpgradeMinuPaymentAccount> {
  const settings = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: [
          STOCK_PAYMENT_ACCOUNT_SETTING_KEY,
          CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
        ],
      },
    },
    select: { key: true, value: true },
  });
  const values = new Map(settings.map((setting) => [setting.key, setting.value]));
  const paymentAccountsValue = values.get(
    CONTRACT_PAYMENT_ACCOUNTS_SETTING_KEY,
  );
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
        values.get(STOCK_PAYMENT_ACCOUNT_SETTING_KEY),
        paymentAccountsValue,
      );

  if (!account?.merchantCode || !account.username || !account.password) {
    throw new StockMinuConfigurationError();
  }
  return account;
}
