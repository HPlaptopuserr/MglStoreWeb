import type { QPayMerchantContext } from "./qpay.types";

type PosRegisterQPayConfig = {
  qpayEnabled: boolean;
  qpayMerchantId: string | null;
  qpayTerminalId: string | null;
};

const resolveSharedPassword = () =>
  process.env.QPAY_MULTI_MERCHANT_PASSWORD || process.env.QPAY_CLIENT_SECRET || "";

export function buildQPayMerchantContextFromPosRegister(
  register: PosRegisterQPayConfig,
): QPayMerchantContext | null {
  if (!register.qpayEnabled) {
    return null;
  }

  const username = (register.qpayMerchantId || "").trim();
  const terminalId = (register.qpayTerminalId || "").trim();
  const password = resolveSharedPassword().trim();

  if (!username || !terminalId || !password) {
    return null;
  }

  return {
    username,
    password,
    terminalId,
    // QuickQR token endpoint requires terminal_id and invoice endpoint uses invoice_code.
    // In current POS config, qpayTerminalId is the only merchant-scoped key we have,
    // so we map it to both until a dedicated invoiceCode field is introduced.
    invoiceCode: terminalId,
    merchantKey: `pos:${username}:${terminalId}`,
  };
}
