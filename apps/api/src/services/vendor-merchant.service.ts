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

    if (!org.qpayEnabled || !org.qpayMerchantId || !org.qpayMerchantKey) {
      return {
        success: true,
        config: null,
      };
    }

    const masterUsername = (process.env.QPAY_QUICKQR_MASTER_USERNAME || "").trim();
    const masterPassword = (process.env.QPAY_QUICKQR_MASTER_PASSWORD || "").trim();
    const masterTerminalId = (process.env.QPAY_QUICKQR_MASTER_TERMINAL_ID || masterUsername).trim();

    // Use master credentials for authentication. The vendor's specific identity
    // is passed via `merchantId` and `bankAccounts` in the invoice body.
    const merchantContext: QPayMerchantContext = {
      username: masterUsername || org.qpayMerchantId, // fallback to org credentials if master missing
      password: masterPassword || org.qpayMerchantKey,
      terminalId: masterTerminalId,
      invoiceCode: null, // QuickQR uses merchantId
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
