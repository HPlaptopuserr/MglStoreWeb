import { prisma, type Prisma } from "@mgl/database";
import { createSystemQrInvoice, checkSystemQrPayment } from "./systemqr";
import {
  STORE_OWNER_PRO_PRICE,
  STORE_OWNER_PRO_INVOICE_TTL_MS,
  storeOwnerProExpiresAt,
} from "./store-owner-pro-policy";

export class StoreOwnerProError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function paymentConfig() {
  const merchantCode = process.env.STORE_OWNERS_MINU_MERCHANT_CODE?.trim();
  const username = (
    process.env.STORE_OWNERS_MINU_USERNAME || process.env.SYSTEMQR_USERNAME
  )?.trim();
  const password = (
    process.env.STORE_OWNERS_MINU_PASSWORD || process.env.SYSTEMQR_PASSWORD
  )?.trim();
  if (!merchantCode || !username || !password) {
    throw new StoreOwnerProError(
      503,
      "Pro эрхийн төлбөрийн үйлчилгээ хараахан тохируулагдаагүй байна.",
    );
  }
  return { merchantCode, username, password };
}

export async function getStoreOwnerProAccess(userId: string, now = new Date()) {
  const payment = await prisma.storeOwnerProPayment.findFirst({
    where: {
      userId,
      status: "PAID",
      amount: STORE_OWNER_PRO_PRICE,
    },
    orderBy: { accessExpiresAt: "desc" },
    select: { paidAt: true, accessExpiresAt: true },
  });
  return {
    active: Boolean(
      payment?.accessExpiresAt &&
      payment.accessExpiresAt.getTime() > now.getTime(),
    ),
    paidAt: payment?.paidAt?.toISOString() ?? null,
    expiresAt: payment?.accessExpiresAt?.toISOString() ?? null,
  };
}

export async function createStoreOwnerProInvoice(userId: string) {
  const config = paymentConfig();
  await recoverStoreOwnerProPayment(userId);
  // Serialize invoice creation across requests/processes for this account.
  const intent = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const now = new Date();
    const active = await tx.storeOwnerProPayment.findFirst({
      where: {
        userId,
        status: "PAID",
        amount: STORE_OWNER_PRO_PRICE,
        accessExpiresAt: { gt: now },
      },
    });
    if (active)
      throw new StoreOwnerProError(
        409,
        "Таны Pro эрх идэвхтэй байна. Хугацаа дууссаны дараа дахин идэвхжүүлнэ үү.",
      );
    const pending = await tx.storeOwnerProPayment.findFirst({
      where: { userId, status: "PENDING", invoiceExpiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });
    if (pending) {
      if (!pending.providerInvoiceId)
        throw new StoreOwnerProError(
          409,
          "Нэхэмжлэх бэлтгэж байна. Түр хүлээгээд дахин оролдоно уу.",
        );
      return { payment: pending, created: false };
    }
    const payment = await tx.storeOwnerProPayment.create({
      data: {
        userId,
        amount: STORE_OWNER_PRO_PRICE,
        merchantCode: config.merchantCode,
        merchantUsername: config.username,
        invoiceExpiresAt: new Date(
          now.getTime() + STORE_OWNER_PRO_INVOICE_TTL_MS,
        ),
      },
    });
    return { payment, created: true };
  });
  if (!intent.created) return intent.payment;

  const payment = intent.payment;
  try {
    const publicUrl = process.env.API_PUBLIC_URL?.replace(/\/+$/, "");
    const invoice = await createSystemQrInvoice(
      {
        merchantCode: payment.merchantCode,
        amount: payment.amount,
        referenceNumber: payment.id,
        webhook: publicUrl
          ? `${publicUrl}/api/store/store-owners/pro/callback?invoiceId=${payment.id}`
          : undefined,
      },
      config.username,
      config.password,
    );
    const providerInvoiceId: unknown = invoice.invoiceId;
    const qrText: unknown = invoice.qrText;
    if (
      typeof providerInvoiceId !== "string" ||
      !providerInvoiceId ||
      typeof qrText !== "string" ||
      !qrText
    ) {
      throw new Error("Incomplete Pro invoice");
    }
    const urls: unknown = invoice.urls;
    const deepLinks = Array.isArray(urls)
      ? urls.flatMap((item: unknown) => {
          if (!item || typeof item !== "object") return [];
          const link = item as Record<string, unknown>;
          if (typeof link.link !== "string" || !link.link) return [];
          return [
            {
              name: typeof link.name === "string" ? link.name : "Банк",
              description:
                typeof link.description === "string" ? link.description : "",
              logo: typeof link.logo === "string" ? link.logo : "",
              link: link.link,
            },
          ];
        })
      : [];
    return await prisma.storeOwnerProPayment.update({
      where: { id: payment.id },
      data: {
        providerInvoiceId,
        qrText,
        deepLinks: deepLinks satisfies Prisma.InputJsonArray,
      },
    });
  } catch (error: unknown) {
    await prisma.storeOwnerProPayment.updateMany({
      where: { id: payment.id, status: "PENDING", providerInvoiceId: null },
      data: { status: "CANCELLED" },
    });
    throw error;
  }
}

export async function recoverStoreOwnerProPayment(userId: string) {
  const access = await getStoreOwnerProAccess(userId);
  if (access.active) return access;
  // Recover the last bank payment after app termination or a missed callback,
  // including an invoice whose on-screen QR timer has elapsed.
  const pending = await prisma.storeOwnerProPayment.findFirst({
    where: { userId, status: "PENDING", providerInvoiceId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (pending) await checkStoreOwnerProPayment(pending.id, userId);
  return getStoreOwnerProAccess(userId);
}

export async function checkStoreOwnerProPayment(
  invoiceId: string,
  userId?: string,
) {
  const payment = await prisma.storeOwnerProPayment.findFirst({
    where: { id: invoiceId, ...(userId ? { userId } : {}) },
  });
  if (!payment) throw new StoreOwnerProError(404, "Нэхэмжлэх олдсонгүй.");
  if (payment.status !== "PENDING" || !payment.providerInvoiceId)
    return payment;
  const config = paymentConfig();
  if (payment.merchantUsername !== config.username) {
    throw new StoreOwnerProError(
      503,
      "Төлбөрийн дансны тохиргоо өөрчлөгдсөн байна. Үйлчилгээний ажилтантай холбогдоно уу.",
    );
  }
  // Callback bodies and client-supplied statuses never grant access.
  const verification = await checkSystemQrPayment(
    {
      merchantCode: payment.merchantCode,
      invoiceNumber: payment.providerInvoiceId,
    },
    config.username,
    config.password,
  );
  if (verification.paid) {
    const paidAt = new Date();
    // Atomic transition: retries/callback races cannot extend the same payment.
    await prisma.storeOwnerProPayment.updateMany({
      where: {
        id: payment.id,
        status: "PENDING",
        amount: STORE_OWNER_PRO_PRICE,
      },
      data: {
        status: "PAID",
        paidAt,
        accessExpiresAt: storeOwnerProExpiresAt(paidAt),
      },
    });
    return prisma.storeOwnerProPayment.findUniqueOrThrow({
      where: { id: payment.id },
    });
  }
  return payment;
}
