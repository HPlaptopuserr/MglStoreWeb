import { prisma } from "@mgl/database";
import type { QPayMerchantContext } from "./qpay.types";
import {
  registerQPayMerchantCompany,
  registerQPayMerchantPerson,
  QPayAlreadyRegisteredError,
  type QPayBankAccount,
  type QPayRegisterCompanyParams,
  type QPayRegisterPersonParams,
} from "./qpay";

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

/**
 * Connect vendor organization to multi-merchant QPay account
 * Stores the QPay merchant ID and key for the organization
 */
export async function connectVendorMerchant(
  organizationId: string,
  merchantId: string,
  merchantKey: string,
  invoiceCode?: string,
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
      data: {
        qpayMerchantId: merchantId.trim(),
        qpayMerchantKey: merchantKey.trim(),
        qpayInvoiceCode: invoiceCode?.trim() || null,
        qpayEnabled: true,
        qpayConnectedAt: new Date(),
      },
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
      data: {
        qpayMerchantId: null,
        qpayMerchantKey: null,
        qpayInvoiceCode: null,
        qpayEnabled: false,
        qpayConnectedAt: null,
      },
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

    console.log("[getVendorMerchantConfig] org QPay state:", {
      qpayEnabled: org.qpayEnabled,
      qpayMerchantId: org.qpayMerchantId,
      qpayMerchantKey: org.qpayMerchantKey ? "set" : "null",
    });

    if (!org.qpayEnabled || !org.qpayMerchantId) {
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
    const isQuickQrUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      org.qpayMerchantId,
    );

    // QuickQR path: UUID merchantId + valid master credentials + base URL configured
    if (isQuickQrUUID && masterUsername && masterPassword && quickqrBaseUrl) {
      console.log("[getVendorMerchantConfig] Using QuickQR path for merchant:", org.qpayMerchantId);
      const merchantContext: QPayMerchantContext = {
        username: masterUsername,
        password: masterPassword,
        terminalId: masterTerminalId,
        invoiceCode: null,
        merchantId: org.qpayMerchantId,
        merchantKey: `vendor:${org.qpayMerchantId}`,
        bankAccounts: Array.isArray(org.qpayBankAccounts)
          ? (org.qpayBankAccounts as unknown as QPayBankAccount[])
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
    const orgInvoiceCode = (org.qpayInvoiceCode || "").trim();
    const orgMerchantKey = (org.qpayMerchantKey || "").trim();
    const orgBankAccounts = Array.isArray(org.qpayBankAccounts)
      ? (org.qpayBankAccounts as unknown as QPayBankAccount[])
      : null;

    // If the vendor has their own QPay credentials, use them directly.
    // QPay authenticates as their own merchant → payments go to their registered bank account.
    if (org.qpayMerchantId && orgMerchantKey) {
      console.log("[getVendorMerchantConfig] Using vendor-own QPay V2 credentials for:", org.qpayMerchantId);
      const merchantContext: QPayMerchantContext = {
        username: org.qpayMerchantId,
        password: orgMerchantKey,
        invoiceCode: orgInvoiceCode || null,
        merchantKey: `v2-own:${org.qpayMerchantId}`,
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
          const isNewUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regResult.merchantId);
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              qpayMerchantId: regResult.merchantId,
              qpayMerchantKey: regResult.merchantKey || null,
              qpayInvoiceCode: regResult.invoiceCode || null,
              qpayEnabled: isNewUUID ? true : !!(regResult.merchantId && regResult.merchantKey),
              qpayConnectedAt: new Date(),
            },
          });

          if (isNewUUID) {
            console.log("[getVendorMerchantConfig] QuickQR auto-registration success, UUID:", regResult.merchantId);
            const merchantContext: QPayMerchantContext = {
              username: masterUsername,
              password: masterPassword,
              terminalId: masterTerminalId,
              invoiceCode: null,
              merchantId: regResult.merchantId,
              merchantKey: `vendor:${regResult.merchantId}`,
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
      merchantKey: `v2:${org.qpayMerchantId}`,
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

export type RegisterVendorParams =
  | ({ type: "company" } & Omit<QPayRegisterCompanyParams, never>)
  | ({ type: "person" } & Omit<QPayRegisterPersonParams, never>);

/**
 * Register vendor with QPay QuickQR and save credentials to org
 */
export async function registerVendorWithQPay(
  organizationId: string,
  params: RegisterVendorParams,
): Promise<ConnectMerchantResult & { raw?: Record<string, unknown> }> {
  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return { success: false, message: "Байгууллага олдсонгүй" };

    const result =
      params.type === "company"
        ? await registerQPayMerchantCompany(params as QPayRegisterCompanyParams)
        : await registerQPayMerchantPerson(params as QPayRegisterPersonParams);

    console.log("QPay registration raw response:", JSON.stringify(result.raw, null, 2));
    console.log("QPay parsed → merchantId:", result.merchantId, "| merchantKey:", result.merchantKey, "| invoiceCode:", result.invoiceCode);

    const bankAccounts: QPayBankAccount[] = (params as any).bank_accounts || [];

    const isQuickQrUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.merchantId || "",
    );
    // QuickQR UUID merchants authenticate via master credentials — no per-vendor key needed
    const qpayEnabled = isQuickQrUUID ? !!result.merchantId : !!(result.merchantId && result.merchantKey);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        qpayMerchantId: result.merchantId || null,
        qpayMerchantKey: result.merchantKey || null,
        qpayInvoiceCode: result.invoiceCode || null,
        qpayBankAccounts: bankAccounts.length > 0 ? (bankAccounts as any) : undefined,
        qpayEnabled,
        qpayConnectedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "QPay мерчант амжилттай бүртгэгдлээ",
      merchantId: result.merchantId,
      raw: result.raw,
    };
  } catch (error: any) {
    console.error("registerVendorWithQPay error", error);
    // Аль хэдийн бүртгэгдсэн → auto-recover хийх
    if (error instanceof QPayAlreadyRegisteredError) {
      try {
        const bankAccounts: QPayBankAccount[] = (params as any).bank_accounts || [];
        const recovered = await autoRecoverMerchant(organizationId, error.registerNumber, bankAccounts);
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
    return { success: false, message: error?.message || "Бүртгэхэд алдаа гарлаа" };
  }
}

async function autoRecoverMerchant(
  organizationId: string,
  registerNumber: string,
  bankAccounts: QPayBankAccount[],
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
    data: {
      qpayMerchantId: merchantId,
      qpayMerchantKey: merchantKey || null,
      qpayEnabled: true,
      qpayConnectedAt: new Date(),
      ...(bankAccounts.length > 0 ? { qpayBankAccounts: bankAccounts as any } : {}),
    },
  });

  console.log(`[autoRecover] Merchant recovered: ${merchantId} (UUID: ${isUUID})`);
  return { success: true, message: "QPay мерчант олдоод амжилттай холбогдлоо", merchantId };
}

/**
 * Check if vendor has merchant account connected
 */
export async function isVendorMerchantConnected(
  organizationId: string,
): Promise<boolean> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { qpayEnabled: true, qpayMerchantId: true },
    });

    return !!(org && org.qpayEnabled && org.qpayMerchantId);
  } catch {
    return false;
  }
}

/**
 * Get vendor merchant status and info
 */
export async function getVendorMerchantStatus(organizationId: string) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        qpayEnabled: true,
        qpayMerchantId: true,
        qpayConnectedAt: true,
      },
    });

    if (!org) {
      return { success: false, error: "Байгууллага олдсонгүй" };
    }

    return {
      success: true,
      isConnected: org.qpayEnabled && !!org.qpayMerchantId,
      merchantId: org.qpayMerchantId || null,
      connectedAt: org.qpayConnectedAt,
      orgName: org.name,
    };
  } catch (error) {
    console.error("vendor merchant status error", error);
    return {
      success: false,
      error: "Мерчант төлөв авахэд алдаа гарлаа",
    };
  }
}
