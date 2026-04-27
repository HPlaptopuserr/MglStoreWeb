import { prisma } from "@mgl/database";
import type { QPayMerchantContext } from "./qpay.types";

export type ConnectMerchantResult = {
  success: boolean;
  message: string;
  merchantId?: string;
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
    await (prisma.organization.update as any)({
      where: { id: organizationId },
      data: {
        qpayMerchantId: merchantId.trim(),
        qpayMerchantKey: merchantKey.trim(),
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
    await (prisma.organization.update as any)({
      where: { id: organizationId },
      data: {
        qpayMerchantId: null,
        qpayMerchantKey: null,
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
    const org = await (prisma.organization.findUnique as any)({
      where: { id: organizationId },
      select: {
        qpayEnabled: true,
        qpayMerchantId: true,
        qpayMerchantKey: true,
        qpayConnectedAt: true,
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

    const merchantContext: QPayMerchantContext = {
      username: org.qpayMerchantId,
      password: org.qpayMerchantKey,
      invoiceCode: undefined,
      merchantKey: `vendor:${org.qpayMerchantId}`,
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

/**
 * Check if vendor has merchant account connected
 */
export async function isVendorMerchantConnected(
  organizationId: string,
): Promise<boolean> {
  try {
    const org = await (prisma.organization.findUnique as any)({
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
    const org = await (prisma.organization.findUnique as any)({
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
