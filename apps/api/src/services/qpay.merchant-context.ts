import type { QPayMerchantContext } from "./qpay.types";
import { buildQuickQrMerchantKey, isQuickQrMerchantId } from "./qpay-provider";

type PosRegisterQPayConfig = {
  qpayEnabled: boolean;
  qpayMerchantId: string | null;
  qpayTerminalId: string | null;
};

/**
 * POS register-н QPay merchant context.
 *
 * ── Стандарт QPay V2 (одоогийн тохиргоо) ───────────────────────────────
 * Register-н qpayMerchantId/qpayTerminalId тохируулагдаагүй бол
 * стандарт QPay V2 env credentials ашиглана (QPAY_CLIENT_ID, QPAY_INVOICE_CODE).
 * Нэг байгууллагад нэг invoice code → merchant.qpay.mn/v2
 *
 * ── QuickQR multi-merchant (ирээдүйн тохиргоо) ─────────────────────────
 * Register-н qpayMerchantId нь QuickQR UUID байвал QuickQR API ашиглана.
 * → sandbox-quickqr.qpay.mn/v2  (эсвэл production)
 */
export function buildQPayMerchantContextFromPosRegister(
  register: PosRegisterQPayConfig,
): QPayMerchantContext | null {
  if (!register.qpayEnabled) {
    return null;
  }

  const qpayMerchantId = (register.qpayMerchantId || "").trim();

  if (isQuickQrMerchantId(qpayMerchantId)) {
    const masterUsername = (process.env.QPAY_QUICKQR_MASTER_USERNAME || "").trim();
    const masterPassword = (process.env.QPAY_QUICKQR_MASTER_PASSWORD || "").trim();
    const masterTerminalId = (
      process.env.QPAY_QUICKQR_MASTER_TERMINAL_ID || masterUsername
    ).trim();
    const quickqrBaseUrl = (process.env.QPAY_QUICKQR_BASE_URL || "").trim();

    if (!masterUsername || !masterPassword || !quickqrBaseUrl) return null;

    return {
      username: masterUsername,
      password: masterPassword,
      terminalId: masterTerminalId,
      invoiceCode: null,
      merchantId: qpayMerchantId,                               // QuickQR UUID
      branchCode: (register.qpayTerminalId || "").trim() || null,
      merchantKey: buildQuickQrMerchantKey(`quickqr:${masterUsername}`, qpayMerchantId),
    };
  }

  // Standard QPay V2 path: use env credentials directly
  // Returns null → caller falls back to org-level config → uses QPAY_CLIENT_ID/INVOICE_CODE
  return null;
}
