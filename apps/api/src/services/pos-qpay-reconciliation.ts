import { prisma, PosQPayStatus, type Prisma } from "@mgl/database";
import { usesOrganizationMerchant } from "./pos-merchant-scope";
import { checkSystemQrPaymentEvidence } from "./systemqr";
import { decodeSystemQrMerchantAuth } from "./systemqr-merchant-auth";
import { checkQPayPayment } from "./qpay";
import { buildQPayMerchantContextFromPosRegister } from "./qpay.merchant-context";
import { getVendorMerchantConfig } from "./vendor-merchant.service";
import { verifiedQPayPaymentId } from "./qpay-payment-verification";

const isSystemQrMarker = (value?: string | null) =>
  String(value || "").trim().toUpperCase() === "SYSTEMQR" ||
  String(value || "").trim().toLowerCase().startsWith("systemqr");


export async function resolveSystemQrConfig(
  organizationId: string | null,
  registerQpayConfig: {
    qpayEnabled: boolean;
    qpayMerchantId: string | null;
    qpayTerminalId: string | null;
  } | null,
) {
  const registerMerchantCode = registerQpayConfig?.qpayEnabled &&
    registerQpayConfig.qpayMerchantId && isSystemQrMarker(registerQpayConfig.qpayTerminalId)
    ? registerQpayConfig.qpayMerchantId.trim() : null;
  const org = organizationId ? await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { qpayEnabled: true, qpayMerchantId: true, qpayMerchantKey: true, qpayInvoiceCode: true },
  }) : null;
  if (registerMerchantCode) {
    const auth = org?.qpayMerchantId?.trim() === registerMerchantCode
      ? decodeSystemQrMerchantAuth(org.qpayMerchantKey, registerMerchantCode) : {};
    return { merchantCode: registerMerchantCode,
      ...(auth.password ? { username: auth.username || registerMerchantCode, password: auth.password } : {}) };
  }
  if (!org?.qpayEnabled || !org.qpayMerchantId) return null;
  if (!isSystemQrMarker(org.qpayInvoiceCode) && !isSystemQrMarker(org.qpayMerchantKey)) return null;

  const merchantCode = org.qpayMerchantId.trim();
  const auth = decodeSystemQrMerchantAuth(org.qpayMerchantKey, merchantCode);
  return {
    merchantCode,
    ...(auth.password
      ? { username: auth.username || merchantCode, password: auth.password }
      : {}),
  };
}

export type ReconciliablePosQPayInvoice = {
  amount: Prisma.Decimal | number;
  id: string;
  organizationId: string | null;
  status: PosQPayStatus;
  webhookPayload: Prisma.JsonValue | null;
  register: {
    qpayEnabled: boolean;
    qpayMerchantId: string | null;
    qpayTerminalId: string | null;
  } | null;
};

export const isSystemQrAuthenticationError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /SystemQR Login Error|username or password|credential|unauthorized|401|403/i.test(
    message,
  );
};

async function reconcilePosQrPaymentNow(
  invoice: ReconciliablePosQPayInvoice,
  lastWebhook?: Record<string, unknown>,
): Promise<{ state: "PAID" | "UNPAID" | "UNKNOWN" }> {
  if (invoice.status === PosQPayStatus.PAID) return { state: "PAID" };
  if (
    invoice.status !== PosQPayStatus.PENDING &&
    invoice.status !== PosQPayStatus.EXPIRED
  ) {
    return { state: "UNKNOWN" };
  }

  const payload = (invoice.webhookPayload || {}) as Record<string, unknown>;
  const providerInvoiceId = String(payload.providerInvoiceId || "").trim();
  if (!providerInvoiceId) return { state: "UNKNOWN" };

  const registerConfig = !usesOrganizationMerchant(payload) && invoice.register
    ? {
        qpayEnabled: invoice.register.qpayEnabled,
        qpayMerchantId: invoice.register.qpayMerchantId,
        qpayTerminalId: invoice.register.qpayTerminalId,
      }
    : null;
  const systemProvider =
    String(payload.provider || "").toUpperCase() === "SYSTEMQR";

  let paymentId = "";
  let paymentCheck: unknown;
  if (systemProvider) {
    const resolved = await resolveSystemQrConfig(
      invoice.organizationId,
      registerConfig,
    );
    const merchantCode = String(
      payload.merchantCode || resolved?.merchantCode || "",
    ).trim();
    if (!merchantCode) return { state: "UNKNOWN" };

    try {
      paymentCheck = await checkSystemQrPaymentEvidence(
        { merchantCode, invoiceNumber: providerInvoiceId, expectedAmount: Number(invoice.amount) },
        resolved?.username,
        resolved?.password,
      );
    } catch (error) {
      if (!resolved?.password || !isSystemQrAuthenticationError(error)) {
        throw error;
      }
      paymentCheck = await checkSystemQrPaymentEvidence({
        merchantCode,
        invoiceNumber: providerInvoiceId,
        expectedAmount: Number(invoice.amount),
      });
    }

    const evidence = paymentCheck as { paid: boolean; verifiedUnpaid: boolean };
    if (!evidence.paid) return { state: evidence.verifiedUnpaid ? "UNPAID" : "UNKNOWN" };
    paymentId = `systemqr-${providerInvoiceId}`;
  } else {
    let merchantContext = registerConfig
      ? buildQPayMerchantContextFromPosRegister(registerConfig)
      : null;
    if (!merchantContext && invoice.organizationId) {
      const orgResult = await getVendorMerchantConfig(invoice.organizationId, "POS", { allowCentralFallback: !usesOrganizationMerchant(payload) });
      merchantContext = orgResult.config ?? null;
    }

    const checked = await checkQPayPayment(
      providerInvoiceId,
      merchantContext || undefined,
    );
    paymentCheck = checked;
    paymentId = verifiedQPayPaymentId(checked, Number(invoice.amount)) || "";
    if (!paymentId) return { state: "UNKNOWN" };
  }

  // Provider I/O may overlap a review, cancellation or another callback. Merge
  // against the row we lock now rather than replacing its newer recovery data.
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "QPayInvoice" WHERE "id" = ${invoice.id} FOR UPDATE`;
    const current = await tx.qPayInvoice.findUnique({ where: { id: invoice.id } });
    if (!current) return { state: "UNKNOWN" as const };
    if (current.status === PosQPayStatus.PAID) return { state: "PAID" as const };
    if (current.consumedAt || current.saleReference ||
        ![PosQPayStatus.PENDING, PosQPayStatus.EXPIRED].includes(current.status))
      return { state: "UNKNOWN" as const };
    const currentPayload = current.webhookPayload && typeof current.webhookPayload === "object" &&
      !Array.isArray(current.webhookPayload) ? current.webhookPayload : {};
    await tx.qPayInvoice.updateMany({
      where: { id: invoice.id, status: { in: [PosQPayStatus.PENDING, PosQPayStatus.EXPIRED] }, consumedAt: null, saleReference: null },
      data: { status: PosQPayStatus.PAID, paymentId, paidAt: new Date(),
        webhookPayload: { ...currentPayload, lastPaymentCheck: paymentCheck,
          ...(lastWebhook ? { lastWebhook } : {}) } as unknown as Prisma.JsonObject },
    });
    return { state: "PAID" as const };
  });
}

const providerChecks = new Map<string, Promise<{ state: "PAID" | "UNPAID" | "UNKNOWN" }>>();

export function reconcilePosQrPayment(
  invoice: ReconciliablePosQPayInvoice,
  lastWebhook?: Record<string, unknown>,
): Promise<{ state: "PAID" | "UNPAID" | "UNKNOWN" }> {
  const active = providerChecks.get(invoice.id);
  if (active) return active;
  const work = reconcilePosQrPaymentNow(invoice, lastWebhook).finally(() => providerChecks.delete(invoice.id));
  providerChecks.set(invoice.id, work);
  return work;
}

/** A UI observation deadline never aborts or cancels the bank reconciliation. */
export async function observePosQrReconciliation(
  work: Promise<boolean>,
  maxWaitMs = 14_000,
): Promise<"COMPLETE" | "PENDING"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work.then(() => "COMPLETE" as const),
      new Promise<"PENDING">(resolve => { timer = setTimeout(() => resolve("PENDING"), maxWaitMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function reconcilePosQPayInvoicePayment(
  invoice: ReconciliablePosQPayInvoice,
  lastWebhook?: Record<string, unknown>,
): Promise<boolean> {
  return (await reconcilePosQrPayment(invoice, lastWebhook)).state === "PAID";
}
