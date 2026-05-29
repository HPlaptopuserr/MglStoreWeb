import { prisma } from "@mgl/database";
import type { QPayMerchantContext } from "./qpay.types";
import { buildQuickQrMerchantKey, isQuickQrMerchantId, redactQPayRegistrationResponse } from "./qpay-provider";
import {
  registerQPayMerchantCompany,
  registerQPayMerchantPerson,
  QPayAlreadyRegisteredError,
  type QPayBankAccount,
  type QPayRegisterCompanyParams,
  type QPayRegisterPersonParams,
} from "./qpay";
import {
  registerSystemQrSubMerchant,
  type SystemQrRegisterSubMerchantParams,
} from "./systemqr";

export type ConnectMerchantResult = {
  success: boolean;
  message: string;
  merchantId?: string;
  alreadyRegistered?: boolean;
};

export type GetMerchantConfigResult = {
  success: boolean;
  config?: QPayMerchantContext | null;
  error?: string;
};

export type MerchantChannel = "POS" | "WEB";

export const normalizeMerchantChannel = (value?: string | null): MerchantChannel =>
  String(value || "").trim().toUpperCase() === "WEB" ? "WEB" : "POS";

const isSystemQrMarker = (value?: string | null) =>
  String(value || "").trim().toUpperCase() === "SYSTEMQR" ||
  String(value || "").trim().toLowerCase().startsWith("systemqr");

const getSystemQrPassword = (value?: string | null) => {
  const marker = String(value || "").trim();
  if (!marker.toLowerCase().startsWith("systemqr:")) return undefined;
  return marker.slice("systemqr:".length) || undefined;
};

const buildMerchantUpdateData = (
  channel: MerchantChannel,
  data: {
    merchantId?: string | null;
    merchantKey?: string | null;
    invoiceCode?: string | null;
    bankAccounts?: QPayBankAccount[] | null | undefined;
    enabled?: boolean;
    connectedAt?: Date | null;
  },
) => {
  if (channel === "WEB") {
    return {
      webQpayMerchantId: data.merchantId ?? null,
      webQpayMerchantKey: data.merchantKey ?? null,
      webQpayInvoiceCode: data.invoiceCode ?? null,
      ...(data.bankAccounts !== undefined ? { webQpayBankAccounts: data.bankAccounts as any } : {}),
      webQpayEnabled: data.enabled ?? false,
      webQpayConnectedAt: data.connectedAt ?? null,
    };
  }

  return {
    qpayMerchantId: data.merchantId ?? null,
    qpayMerchantKey: data.merchantKey ?? null,
    qpayInvoiceCode: data.invoiceCode ?? null,
    ...(data.bankAccounts !== undefined ? { qpayBankAccounts: data.bankAccounts as any } : {}),
    qpayEnabled: data.enabled ?? false,
    qpayConnectedAt: data.connectedAt ?? null,
  };
};

const pickMerchantFields = (org: any, channel: MerchantChannel) => {
  if (channel === "WEB") {
    return {
      enabled: org.webQpayEnabled,
      merchantId: org.webQpayMerchantId,
      merchantKey: org.webQpayMerchantKey,
      invoiceCode: org.webQpayInvoiceCode,
      bankAccounts: org.webQpayBankAccounts,
      connectedAt: org.webQpayConnectedAt,
    };
  }

  return {
    enabled: org.qpayEnabled,
    merchantId: org.qpayMerchantId,
    merchantKey: org.qpayMerchantKey,
    invoiceCode: org.qpayInvoiceCode,
    bankAccounts: org.qpayBankAccounts,
    connectedAt: org.qpayConnectedAt,
  };
};

/**
 * Connect vendor organization to multi-merchant QPay account
 * Stores the QPay merchant ID and key for the organization
 */
export async function connectVendorMerchant(
  organizationId: string,
  merchantId: string,
  merchantKey: string,
  invoiceCode?: string,
  channel: MerchantChannel = "POS",
): Promise<ConnectMerchantResult> {
  try {
    if (!organizationId || !merchantId || !merchantKey) {
      return {
        success: false,
        message: "Байгууллагын ID, merchant ID ба key шаардлагатай",
      };
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return {
        success: false,
        message: "Байгууллага олдсонгүй",
      };
    }

    // Update organization with merchant credentials
    await prisma.organization.update({
      where: { id: organizationId },
      data: buildMerchantUpdateData(channel, {
        merchantId: merchantId.trim(),
        merchantKey: merchantKey.trim(),
        invoiceCode: invoiceCode?.trim() || null,
        enabled: true,
        connectedAt: new Date(),
      }),
    });

    return {
      success: true,
      message: "Мерчант данс амжилттай холбогдлоо",
      merchantId: merchantId,
    };
  } catch (error) {
    console.error("vendor merchant connect error", error);
    return {
      success: false,
      message: "Мерчант данс холбохэд алдаа гарлаа",
    };
  }
}

/**
 * Disconnect vendor merchant account
 */
export async function disconnectVendorMerchant(
  organizationId: string,
  channel: MerchantChannel = "POS",
): Promise<ConnectMerchantResult> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return {
        success: false,
        message: "Байгууллага олдсонгүй",
      };
    }

    // Clear merchant credentials but keep bank accounts so re-registration can use them
    await prisma.organization.update({
      where: { id: organizationId },
      data: buildMerchantUpdateData(channel, {
        merchantId: null,
        merchantKey: null,
        invoiceCode: null,
        enabled: false,
        connectedAt: null,
      }),
    });

    return {
      success: true,
      message: "Мерчант данс сүүлэм салгагдлоо",
    };
  } catch (error) {
    console.error("vendor merchant disconnect error", error);
    return {
      success: false,
      message: "Мерчант данс салгахэд алдаа гарлаа",
    };
  }
}

/**
 * Get merchant configuration for organization
 */
export async function getVendorMerchantConfig(
  organizationId: string,
  channel: MerchantChannel = "POS",
): Promise<GetMerchantConfigResult> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        qpayEnabled: true,
        qpayMerchantId: true,
        qpayMerchantKey: true,
        qpayInvoiceCode: true,
        qpayConnectedAt: true,
        qpayBankAccounts: true,
        webQpayEnabled: true,
        webQpayMerchantId: true,
        webQpayMerchantKey: true,
        webQpayInvoiceCode: true,
        webQpayConnectedAt: true,
        webQpayBankAccounts: true,
        taxId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
    });

    if (!org) {
      return {
        success: false,
        error: "Байгууллага олдсонгүй",
      };
    }

    const selected = pickMerchantFields(org, channel);

    console.log("[getVendorMerchantConfig] org QPay state:", {
      channel,
      qpayEnabled: selected.enabled,
      qpayMerchantId: selected.merchantId,
      qpayMerchantKey: selected.merchantKey ? "set" : "null",
    });

    if (!selected.enabled || !selected.merchantId) {
      return {
        success: true,
        config: null,
      };
    }

    const masterUsername = (process.env.QPAY_QUICKQR_MASTER_USERNAME || "").trim();
    const masterPassword = (process.env.QPAY_QUICKQR_MASTER_PASSWORD || "").trim();
    const masterTerminalId = (process.env.QPAY_QUICKQR_MASTER_TERMINAL_ID || masterUsername).trim();
    const quickqrBaseUrl = (process.env.QPAY_QUICKQR_BASE_URL || "").trim();

    // Check if the merchantId is a QuickQR UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const isQuickQrUUID = isQuickQrMerchantId(selected.merchantId);

    // QuickQR path: UUID merchantId + valid master credentials + base URL configured
    if (isQuickQrUUID && masterUsername && masterPassword && quickqrBaseUrl) {
      console.log("[getVendorMerchantConfig] Using QuickQR path for merchant:", selected.merchantId);
      const merchantContext: QPayMerchantContext = {
        username: masterUsername,
        password: masterPassword,
        terminalId: masterTerminalId,
        invoiceCode: null,
        merchantId: selected.merchantId,
        merchantKey: buildQuickQrMerchantKey("vendor", selected.merchantId),
        bankAccounts: Array.isArray(selected.bankAccounts)
          ? (selected.bankAccounts as unknown as QPayBankAccount[])
          : null,
      };

      return {
        success: true,
        config: merchantContext,
      };
    }

    // Standard QPay V2 path
    const centralClientId = (process.env.QPAY_CLIENT_ID || "").trim();
    const centralClientSecret = (process.env.QPAY_CLIENT_SECRET || "").trim();
    const centralInvoiceCode = (process.env.QPAY_INVOICE_CODE || "").trim();
    const orgInvoiceCode = (selected.invoiceCode || "").trim();
    const orgMerchantKey = (selected.merchantKey || "").trim();
    const orgBankAccounts = Array.isArray(selected.bankAccounts)
      ? (selected.bankAccounts as unknown as QPayBankAccount[])
      : null;

    // If the vendor has their own QPay credentials, use them directly.
    // QPay authenticates as their own merchant → payments go to their registered bank account.
    if (selected.merchantId && orgMerchantKey) {
      console.log("[getVendorMerchantConfig] Using vendor-own QPay V2 credentials for:", selected.merchantId);
      const merchantContext: QPayMerchantContext = {
        username: selected.merchantId,
        password: orgMerchantKey,
        invoiceCode: orgInvoiceCode || null,
        merchantKey: `v2-own:${selected.merchantId}`,
        bankAccounts: orgBankAccounts,
      };
      return { success: true, config: merchantContext };
    }

    // If vendor has saved bank accounts + QuickQR is configured →
    // auto-register them as a QuickQR sub-merchant so their bank account is used.
    if (orgBankAccounts?.length && masterUsername && masterPassword && quickqrBaseUrl && org.taxId) {
      console.log("[getVendorMerchantConfig] Auto-registering vendor via QuickQR for org:", organizationId);
      try {
        const regResult = await registerQPayMerchantCompany({
          register_number: org.taxId,
          company_name: org.name,
          name: org.name,
          mcc_code: "5999",
          city: "11000",
          district: "110400",
          address: org.address || org.name,
          phone: org.phone || "99999999",
          email: org.email || "info@mglstore.mn",
          bank_accounts: orgBankAccounts,
        });

        if (regResult.merchantId) {
          const isNewUUID = isQuickQrMerchantId(regResult.merchantId);
          await prisma.organization.update({
            where: { id: organizationId },
            data: buildMerchantUpdateData(channel, {
              merchantId: regResult.merchantId,
              merchantKey: regResult.merchantKey || null,
              invoiceCode: regResult.invoiceCode || null,
              enabled: isNewUUID ? true : !!(regResult.merchantId && regResult.merchantKey),
              connectedAt: new Date(),
            }),
          });

          if (isNewUUID) {
            console.log("[getVendorMerchantConfig] QuickQR auto-registration success, UUID:", regResult.merchantId);
            const merchantContext: QPayMerchantContext = {
              username: masterUsername,
              password: masterPassword,
              terminalId: masterTerminalId,
              invoiceCode: null,
              merchantId: regResult.merchantId,
              merchantKey: buildQuickQrMerchantKey("vendor", regResult.merchantId),
              bankAccounts: orgBankAccounts,
            };
            return { success: true, config: merchantContext };
          }
        }
      } catch (regError: any) {
        // Already registered → try to recover via register number
        if (regError?.message?.includes("ALREADY") || regError?.message?.includes("exist")) {
          console.log("[getVendorMerchantConfig] Already registered in QuickQR, attempting recovery for:", org.taxId);
        } else {
          console.warn("[getVendorMerchantConfig] QuickQR auto-registration failed, falling back to V2:", regError?.message);
        }
      }
    }

    // Fall back to central credentials — payments go to platform default account.
    if (!centralClientId || !centralClientSecret) {
      console.warn("[getVendorMerchantConfig] No QPay credentials configured");
      return { success: true, config: null };
    }

    console.log("[getVendorMerchantConfig] Using central QPay V2 credentials, invoiceCode:", orgInvoiceCode || centralInvoiceCode);
    const merchantContext: QPayMerchantContext = {
      username: centralClientId,
      password: centralClientSecret,
      invoiceCode: orgInvoiceCode || centralInvoiceCode || null,
      merchantKey: `v2:${selected.merchantId}`,
      bankAccounts: orgBankAccounts,
    };

    return { success: true, config: merchantContext };
  } catch (error) {
    console.error("vendor merchant config error", error);
    return {
      success: false,
      error: "Мерчант конфиг авахэд алдаа гарлаа",
    };
  }
}

export async function getVendorSystemQrConfig(
  organizationId: string,
  channel: MerchantChannel = "POS",
): Promise<{
  merchantCode: string;
  username?: string;
  password?: string;
} | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      qpayEnabled: true,
      qpayMerchantId: true,
      qpayMerchantKey: true,
      qpayInvoiceCode: true,
      webQpayEnabled: true,
      webQpayMerchantId: true,
      webQpayMerchantKey: true,
      webQpayInvoiceCode: true,
    },
  });

  if (!org) return null;

  const selected = pickMerchantFields(org, channel);
  if (!selected.enabled || !selected.merchantId) return null;
  if (!isSystemQrMarker(selected.invoiceCode) && !isSystemQrMarker(selected.merchantKey)) {
    return null;
  }

  const password = getSystemQrPassword(selected.merchantKey);
  const merchantCode = String(selected.merchantId).trim();
  return {
    merchantCode,
    ...(password ? { username: merchantCode, password } : {}),
  };
}

export type RegisterVendorParams =
  | ({ type: "company" } & Omit<QPayRegisterCompanyParams, never>)
  | ({ type: "person" } & Omit<QPayRegisterPersonParams, never>);

export type RegisterVendorSystemQrParams = SystemQrRegisterSubMerchantParams & {
  bank_accounts?: QPayBankAccount[];
};

export async function registerVendorWithSystemQr(
  organizationId: string,
  params: RegisterVendorSystemQrParams,
  channel: MerchantChannel = "POS",
): Promise<ConnectMerchantResult & { raw?: Record<string, unknown>; username?: string }> {
  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return { success: false, message: "Байгууллага олдсонгүй" };

    const result = await registerSystemQrSubMerchant(params);
    const bankAccounts: QPayBankAccount[] =
      params.bank_accounts?.length
        ? params.bank_accounts
        : [{
            account_bank_code: params.bankCode,
            account_number: params.accountNumber,
            account_name: params.merchantName,
            is_default: true,
          }];

    await prisma.organization.update({
      where: { id: organizationId },
      data: buildMerchantUpdateData(channel, {
        merchantId: result.merchantCode,
        merchantKey: result.password ? `systemqr:${result.password}` : "systemqr",
        invoiceCode: "SYSTEMQR",
        bankAccounts,
        enabled: true,
        connectedAt: new Date(),
      }),
    });

    return {
      success: true,
      message: "Minu Dynamic QR дэд мерчант амжилттай бүртгэгдлээ",
      merchantId: result.merchantCode,
      username: result.username,
      raw: result.raw,
    };
  } catch (error: any) {
    console.error("registerVendorWithSystemQr error", error);
    const message = String(error?.message || "");
    if (/P2002|Unique constraint/i.test(message)) {
      return {
        success: false,
        message: "Энэ merchantCode өөр байгууллага дээр аль хэдийн холбогдсон байна.",
      };
    }
    return {
      success: false,
      message: message || "Minu Dynamic QR дэд мерчант бүртгэхэд алдаа гарлаа",
    };
  }
}

/**
 * Register vendor with QPay QuickQR and save credentials to org
 */
export async function registerVendorWithQPay(
  organizationId: string,
  params: RegisterVendorParams,
  channel: MerchantChannel = "POS",
): Promise<ConnectMerchantResult & { raw?: Record<string, unknown> }> {
  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return { success: false, message: "Байгууллага олдсонгүй" };

    const result =
      params.type === "company"
        ? await registerQPayMerchantCompany(params as QPayRegisterCompanyParams)
        : await registerQPayMerchantPerson(params as QPayRegisterPersonParams);

    console.log("QPay registration raw response:", JSON.stringify(redactQPayRegistrationResponse(result.raw), null, 2));
    console.log("QPay parsed → merchantId:", result.merchantId, "| merchantKey:", result.merchantKey, "| invoiceCode:", result.invoiceCode);

    const bankAccounts: QPayBankAccount[] = (params as any).bank_accounts || [];

    const isQuickQrUUID = isQuickQrMerchantId(result.merchantId);
    // QuickQR UUID merchants authenticate via master credentials — no per-vendor key needed
    const qpayEnabled = isQuickQrUUID ? !!result.merchantId : !!(result.merchantId && result.merchantKey);

    await prisma.organization.update({
      where: { id: organizationId },
      data: buildMerchantUpdateData(channel, {
        merchantId: result.merchantId || null,
        merchantKey: result.merchantKey || null,
        invoiceCode: result.invoiceCode || null,
        bankAccounts: bankAccounts.length > 0 ? bankAccounts : undefined,
        enabled: qpayEnabled,
        connectedAt: new Date(),
      }),
    });

    return {
      success: true,
      message: "QPay мерчант амжилттай бүртгэгдлээ",
      merchantId: result.merchantId,
      raw: result.raw,
    };
  } catch (error: any) {
    console.error("registerVendorWithQPay error", error);
    const errorMessage = String(error?.message || "");
    // Аль хэдийн бүртгэгдсэн → auto-recover хийх
    if (error instanceof QPayAlreadyRegisteredError) {
      try {
        const bankAccounts: QPayBankAccount[] = (params as any).bank_accounts || [];
        const recovered = await autoRecoverMerchant(organizationId, error.registerNumber, bankAccounts, channel);
        if (recovered.success) return recovered;
      } catch (recErr) {
        console.error("auto-recover failed", recErr);
      }
      return {
        success: false,
        message: `Энэ регистрийн дугаараар QPay мерчант аль хэдийн бүртгэгдсэн. Recover автоматаар амжилтгүй боллоо — QPay-тай шууд холбогдоно уу.`,
        alreadyRegistered: true,
      };
    }
    if (/QPAY_QUICKQR|QuickQR.*тохиргоо дутуу|QuickQR.*credentials/i.test(errorMessage)) {
      return {
        success: false,
        message:
          'QPay QuickQR бүртгэл энэ орчинд идэвхгүй байна. Minu Dynamic QR ашиглах бол "Данс аль хэдийн байна" хэсгээс "Minu Dynamic QR" сонгоод тухайн дэлгүүрийн merchantCode оруулна уу.',
      };
    }
    return { success: false, message: errorMessage || "Бүртгэхэд алдаа гарлаа" };
  }
}

async function autoRecoverMerchant(
  organizationId: string,
  registerNumber: string,
  bankAccounts: QPayBankAccount[],
  channel: MerchantChannel = "POS",
): Promise<ConnectMerchantResult> {
  const quickqrBaseUrl = (process.env.QPAY_QUICKQR_BASE_URL || "").trim();
  const masterUsername = (process.env.QPAY_QUICKQR_MASTER_USERNAME || "").trim();
  const masterPassword = (process.env.QPAY_QUICKQR_MASTER_PASSWORD || "").trim();
  const terminalId = (process.env.QPAY_QUICKQR_MASTER_TERMINAL_ID || masterUsername).trim();

  if (!quickqrBaseUrl || !masterUsername || !masterPassword) {
    throw new Error("QPay QuickQR тохиргоо дутуу");
  }

  const credentials = Buffer.from(`${masterUsername}:${masterPassword}`).toString("base64");
  const tokenRes = await fetch(`${quickqrBaseUrl}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({ terminal_id: terminalId }),
  });
  if (!tokenRes.ok) throw new Error("QPay auth алдаа");
  const { access_token } = await tokenRes.json() as { access_token: string };

  const listRes = await fetch(`${quickqrBaseUrl}/merchant/list`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ offset: { page_number: 1, page_limit: 200 } }),
  });
  if (!listRes.ok) throw new Error("Мерчант жагсаалт авахэд алдаа");

  const listData = await listRes.json() as Record<string, unknown>;
  const rows = (listData.rows || listData.merchants || listData.data || listData) as Record<string, unknown>[];
  if (!Array.isArray(rows)) throw new Error("Мерчант жагсаалт буруу формат");

  const match = rows.find((m) => {
    const reg = String(m.register_number || m.register_no || m.register || "").toLowerCase();
    return reg === registerNumber.toLowerCase();
  });

  if (!match) throw new Error(`"${registerNumber}" мерчант QPay-д олдсонгүй`);

  const merchantId = String(match.merchant_id || match.id || match.username || "");
  if (!merchantId) throw new Error("Мерчант ID олдсонгүй");

  const merchantKey = String(match.merchant_key || match.password || match.secret || "");
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(merchantId);

  await prisma.organization.update({
    where: { id: organizationId },
    data: buildMerchantUpdateData(channel, {
      merchantId,
      merchantKey: merchantKey || null,
      bankAccounts: bankAccounts.length > 0 ? bankAccounts : undefined,
      enabled: true,
      connectedAt: new Date(),
    }),
  });

  console.log(`[autoRecover] Merchant recovered: ${merchantId} (UUID: ${isUUID})`);
  return { success: true, message: "QPay мерчант олдоод амжилттай холбогдлоо", merchantId };
}

/**
 * Check if vendor has merchant account connected
 */
export async function isVendorMerchantConnected(
  organizationId: string,
  channel: MerchantChannel = "POS",
): Promise<boolean> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        qpayEnabled: true,
        qpayMerchantId: true,
        webQpayEnabled: true,
        webQpayMerchantId: true,
      },
    });

    if (!org) return false;
    const selected = pickMerchantFields(org, channel);
    return !!(selected.enabled && selected.merchantId);
  } catch {
    return false;
  }
}

/**
 * Get vendor merchant status and info
 */
export async function getVendorMerchantStatus(
  organizationId: string,
  channel: MerchantChannel = "POS",
) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        qpayEnabled: true,
        qpayMerchantId: true,
        qpayMerchantKey: true,
        qpayInvoiceCode: true,
        qpayConnectedAt: true,
        webQpayEnabled: true,
        webQpayMerchantId: true,
        webQpayMerchantKey: true,
        webQpayInvoiceCode: true,
        webQpayConnectedAt: true,
      },
    });

    if (!org) {
      return { success: false, error: "Байгууллага олдсонгүй" };
    }

    const selected = pickMerchantFields(org, channel);
    const isSystemQr =
      isSystemQrMarker(selected.merchantKey) || isSystemQrMarker(selected.invoiceCode);

    return {
      success: true,
      isConnected: selected.enabled && !!selected.merchantId,
      merchantId: selected.merchantId || null,
      connectedAt: selected.connectedAt,
      orgName: org.name,
      managedBySystem: isSystemQr,
      provider: isSystemQr ? "SYSTEMQR" : "QPAY",
      channel,
    };
  } catch (error) {
    console.error("vendor merchant status error", error);
    return {
      success: false,
      error: "Мерчант төлөв авахэд алдаа гарлаа",
    };
  }
}
