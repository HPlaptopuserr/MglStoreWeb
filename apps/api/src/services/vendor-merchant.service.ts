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

    // Clear merchant credentials
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        qpayMerchantId: null,
        qpayMerchantKey: null,
        qpayInvoiceCode: null,
        qpayBankAccounts: [],
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

    // If the vendor has their own QPay credentials, use them directly.
    // This ensures QPay authenticates as their own merchant and routes
    // payments to their registered bank account.
    if (org.qpayMerchantId && orgMerchantKey) {
      console.log("[getVendorMerchantConfig] Using vendor-own QPay V2 credentials for:", org.qpayMerchantId);
      const merchantContext: QPayMerchantContext = {
        username: org.qpayMerchantId,
        password: orgMerchantKey,
        invoiceCode: orgInvoiceCode || null,
        merchantKey: `v2-own:${org.qpayMerchantId}`,
        bankAccounts: Array.isArray(org.qpayBankAccounts)
          ? (org.qpayBankAccounts as unknown as QPayBankAccount[])
          : null,
      };
      return { success: true, config: merchantContext };
    }

    // Fall back to central credentials — payments go to platform default account.
    if (!centralClientId || !centralClientSecret) {
      console.warn("[getVendorMerchantConfig] No QPay credentials configured (neither QuickQR nor V2)");
      return { success: true, config: null };
    }

    console.log("[getVendorMerchantConfig] Using central QPay V2 credentials, invoiceCode:", orgInvoiceCode || centralInvoiceCode);
    const merchantContext: QPayMerchantContext = {
      username: centralClientId,
      password: centralClientSecret,
      invoiceCode: orgInvoiceCode || centralInvoiceCode || null,
      merchantKey: `v2:${org.qpayMerchantId}`,
      bankAccounts: Array.isArray(org.qpayBankAccounts)
        ? (org.qpayBankAccounts as unknown as QPayBankAccount[])
        : null,
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

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        qpayMerchantId: result.merchantId || null,
        qpayMerchantKey: result.merchantKey || null,
        qpayInvoiceCode: result.invoiceCode || null,
        qpayBankAccounts: bankAccounts.length > 0 ? (bankAccounts as any) : undefined,
        qpayEnabled: !!(result.merchantId && result.merchantKey),
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
    // Тухайн регистрийн дугаараар QPay мерчант аль хэдийн бүртгэгдсэн
    if (error instanceof QPayAlreadyRegisteredError) {
      return {
        success: false,
        message:
          `Энэ регистрийн дугаараар (${error.registerNumber}) QPay мерчант аль хэдийн бүртгэгдсэн байна. ` +
          `"Данс аль хэдийн байна" tab руу орж Мерчант ID болон Key-ээ оруулна уу.`,
        alreadyRegistered: true,
      };
    }
    return { success: false, message: error?.message || "Бүртгэхэд алдаа гарлаа" };
  }
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
