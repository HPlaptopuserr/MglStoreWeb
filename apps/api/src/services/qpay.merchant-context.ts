import type { QPayMerchantContext } from "./qpay.types";

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

  // QuickQR path: register has a UUID merchant_id from QuickQR registration
  // UUID pattern check (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    qpayMerchantId,
  );

  if (isUUID) {
    const masterUsername = (process.env.QPAY_QUICKQR_MASTER_USERNAME || "").trim();
    const masterPassword = (process.env.QPAY_QUICKQR_MASTER_PASSWORD || "").trim();
    const masterTerminalId = (
      process.env.QPAY_QUICKQR_MASTER_TERMINAL_ID || masterUsername
    ).trim();

    if (!masterUsername || !masterPassword) return null;

    return {
      username: masterUsername,
      password: masterPassword,
      terminalId: masterTerminalId,
      invoiceCode: null,
      merchantId: qpayMerchantId,                               // QuickQR UUID
      branchCode: (register.qpayTerminalId || "").trim() || null,
      merchantKey: `quickqr:${masterUsername}:${qpayMerchantId}`,
    };
  }

  // Standard QPay V2 path: use env credentials directly
  // Returns null → caller falls back to org-level config → uses QPAY_CLIENT_ID/INVOICE_CODE
  return null;
}

