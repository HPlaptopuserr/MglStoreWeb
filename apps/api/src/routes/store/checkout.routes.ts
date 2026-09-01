import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import jwt from "jsonwebtoken";
import { OrderDispatchAttemptStatus } from "@prisma/client";
import {
  DeliveryStatus,
  prisma,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  InventoryReason,
  type Prisma,
} from "@mgl/database";
import { resolveMarketplaceProductPricing } from "@mgl/types";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import {
  adjustStock,
  resolveOrgWarehouse,
} from "../../services/inventory.service";
import {
  getVendorMerchantConfig,
  getVendorSystemQrConfig,
} from "../../services/vendor-merchant.service";
import {
  checkSystemQrPayment,
  createSystemQrInvoice,
} from "../../services/systemqr";
import {
  cancelExpiredStoreCheckouts,
  STORE_CHECKOUT_PAYMENT_TIMEOUT_MS,
} from "../../services/store-checkout-expiration.service";
import {
  notifyNewOnlineOrderRequest,
  notifyNewPaidOrder,
} from "../../services/order-notification.service";
import { getPreorderParticipantIds } from "../../services/preorder-capacity.service";

const router: ExpressRouter = Router();

class PreorderCapacityFullError extends Error {
  constructor(public readonly productName: string) {
    super(`${productName} захиалгын бараа дүүрсэн байна`);
    this.name = "PreorderCapacityFullError";
  }
}
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        throw new Error("FATAL: JWT_SECRET not set");
      })()
    : "dev-secret-change-me");

/* ── Auth helper ──────────────────────────────────────── */
const getCustomer = async (req: Request) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
    if (!decoded?.userId) return null;
    return prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true,
        isPrime: true,
        membershipExpiresAt: true,
        organizationMemberships: {
          where: {
            role: "OWNER",
            isActive: true,
            deletedAt: null,
            organization: { deletedAt: null },
          },
          select: { id: true },
          take: 1,
        },
      },
    });
  } catch {
    return null;
  }
};

const isActiveMember = (user: {
  isPrime: boolean;
  membershipExpiresAt?: Date | null;
}) =>
  Boolean(
    user.isPrime &&
    (!user.membershipExpiresAt ||
      user.membershipExpiresAt.getTime() > Date.now()),
  );

/* ── helpers ──────────────────────────────────────────── */
const generateOrderNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `ORD-${y}${m}${d}-${rand}`;
};

const getStoreQPayCallbackUrl = (orderId: string) => {
  const publicUrl = (
    process.env.API_PUBLIC_URL ||
    process.env.API_URL ||
    ""
  ).replace(/\/+$/, "");
  return publicUrl
    ? `${publicUrl}/api/store/qpay/callback?orderId=${encodeURIComponent(orderId)}`
    : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const CONTRACT_PAYMENT_ACCOUNTS_KEY = "contract-payment-accounts";
const configuredMinimumOrderAmount = Number(
  process.env.STORE_MINIMUM_ORDER_AMOUNT || 0,
);
const STORE_MINIMUM_ORDER_AMOUNT =
  Number.isFinite(configuredMinimumOrderAmount) &&
  configuredMinimumOrderAmount > 0
    ? Math.floor(configuredMinimumOrderAmount)
    : 0;

type LegacyStorePaymentAccount = {
  merchantCode: string;
  username: string;
  password: string;
};

/** Existing invoices created before seller-only routing must remain verifiable. */
async function getLegacyStorePaymentAccount(merchantCode: string) {
  if (!merchantCode) return null;
  const setting = await prisma.siteSetting.findUnique({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY },
    select: { value: true },
  });
  if (!setting?.value) return null;

  try {
    const accounts = JSON.parse(setting.value);
    if (!Array.isArray(accounts)) return null;
    const matched = accounts.find(
      (account) =>
        String(account?.merchantCode || "").trim() === merchantCode,
    );
    if (!matched) return null;
    return {
      merchantCode,
      username: String(
        matched?.username || matched?.merchantCode || "",
      ).trim(),
      password: String(matched?.password || "").trim(),
    } satisfies LegacyStorePaymentAccount;
  } catch {
    return null;
  }
}

async function autoAssignExpiredCheckout(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const expired = await tx.orderDispatchAttempt.findMany({
      where: {
        orderId,
        status: OrderDispatchAttemptStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      orderBy: [{ distanceKm: "asc" }, { requestedAt: "asc" }],
      select: {
        id: true,
        branchId: true,
        order: {
          select: {
            branchId: true,
            status: true,
          },
        },
        branch: { select: { name: true } },
      },
    });

    if (expired.length === 0) {
      return null;
    }

    await tx.orderDispatchAttempt.updateMany({
      where: { id: { in: expired.map((attempt) => attempt.id) } },
      data: {
        status: OrderDispatchAttemptStatus.EXPIRED,
        respondedAt: new Date(),
      },
    });

    const fallbackAttempt = expired[0];
    if (!fallbackAttempt || fallbackAttempt.order.branchId) return null;

    const claimed = await tx.order.updateMany({
      where: { id: orderId, branchId: null },
      data: {
        branchId: fallbackAttempt.branchId,
        status: OrderStatus.CONFIRMED,
      },
    });
    if (claimed.count === 0) return null;

    await tx.orderDispatchAttempt.update({
      where: { id: fallbackAttempt.id },
      data: {
        status: OrderDispatchAttemptStatus.ACCEPTED,
        respondedAt: new Date(),
        note: "10 секундэд хариу ирээгүй тул систем автоматаар оноосон",
      },
    });

    await tx.orderDispatchAttempt.updateMany({
      where: {
        orderId,
        id: { not: fallbackAttempt.id },
        status: {
          in: [
            OrderDispatchAttemptStatus.PENDING,
            OrderDispatchAttemptStatus.QUEUED,
          ],
        },
      },
      data: {
        status: OrderDispatchAttemptStatus.CANCELLED,
        respondedAt: new Date(),
        note: "Хүргэлтийн fallback assignment үүссэн",
      },
    });

    await tx.orderHistory.create({
      data: {
        orderId,
        fromStatus: fallbackAttempt.order.status as OrderStatus,
        toStatus: OrderStatus.CONFIRMED,
        note: `${fallbackAttempt.branch.name} салбарыг 10 секундийн дараа автоматаар сонгож, хүргэлтийн ажилтанд шилжүүлсэн`,
      },
    });

    return;
  });
}

async function getCheckoutDispatchSnapshot(
  orderId: string,
  customerId: string,
) {
  await autoAssignExpiredCheckout(orderId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      createdAt: true,
      customerId: true,
      orderNumber: true,
      subtotal: true,
      total: true,
      shippingAddress: true,
      customerLat: true,
      customerLng: true,
      branchId: true,
      paymentStatus: true,
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          productSku: true,
          quantity: true,
          price: true,
          subtotal: true,
          product: {
            select: {
              unit: true,
              images: { take: 1, select: { url: true } },
            },
          },
        },
      },
      delivery: {
        select: {
          courierId: true,
          providerOrganizationId: true,
        },
      },
      branch: {
        select: { id: true, name: true, address: true, lat: true, lng: true },
      },
      dispatchAttempts: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          branchId: true,
          status: true,
          sequence: true,
          distanceKm: true,
          requestedAt: true,
          expiresAt: true,
          respondedAt: true,
          note: true,
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              lat: true,
              lng: true,
            },
          },
        },
      },
    },
  });

  if (!order || order.customerId !== customerId) return null;

  const activeAttempt = order.dispatchAttempts.find(
    (attempt) => attempt.status === OrderDispatchAttemptStatus.PENDING,
  );
  const queuedCount = order.dispatchAttempts.filter(
    (attempt) => attempt.status === OrderDispatchAttemptStatus.QUEUED,
  ).length;
  const hasAssignedDelivery = Boolean(order.delivery?.courierId);
  const hasAccepted = Boolean(order.branchId || hasAssignedDelivery);
  const activeZone = activeAttempt?.sequence || null;
  const emptyRadarExpiresAt = new Date(
    order.createdAt.getTime() + DISPATCH_WINDOW_SECONDS * 1000,
  );
  const isEmptyRadarPending =
    order.dispatchAttempts.length === 0 &&
    emptyRadarExpiresAt.getTime() > Date.now();

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productName,
      sku: item.productSku,
      unit: item.product.unit,
      quantity: item.quantity,
      price: Number(item.price),
      subtotal: Number(item.subtotal),
      imageUrl: item.product.images[0]?.url || null,
    })),
    status: hasAccepted
      ? "ACCEPTED"
      : activeAttempt
        ? "SEARCHING"
        : queuedCount > 0
          ? "QUEUED"
          : order.dispatchAttempts.length > 0
            ? "NO_BRANCH_AVAILABLE"
            : isEmptyRadarPending
              ? "SEARCHING"
              : "NO_BRANCH_AVAILABLE",
    canPay: hasAccepted && order.paymentStatus !== PaymentStatus.PAID,
    autoAssignedDelivery: hasAssignedDelivery,
    acceptedBranch: order.branch,
    customerLocation: {
      address: order.shippingAddress,
      lat: order.customerLat,
      lng: order.customerLng,
    },
    radiusZonesKm: DISPATCH_RADIUS_ZONES_KM,
    activeZone,
    activeRadiusKm: activeZone
      ? (DISPATCH_RADIUS_ZONES_KM[activeZone - 1] ?? null)
      : null,
    activeAttemptId: activeAttempt?.id || null,
    activeExpiresAt:
      activeAttempt?.expiresAt?.toISOString() ||
      (isEmptyRadarPending ? emptyRadarExpiresAt.toISOString() : null),
    attempts: order.dispatchAttempts.map((attempt) => ({
      id: attempt.id,
      branchId: attempt.branchId,
      status: attempt.status,
      sequence: attempt.sequence,
      distanceKm: attempt.distanceKm,
      requestedAt: attempt.requestedAt.toISOString(),
      expiresAt: attempt.expiresAt?.toISOString() || null,
      respondedAt: attempt.respondedAt?.toISOString() || null,
      note: attempt.note,
      branch: attempt.branch,
    })),
  };
}

async function createStorePaymentInvoice(params: {
  organizationId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
}) {
  const systemQrConfig = await getVendorSystemQrConfig(
    params.organizationId,
    "POS",
  );

  if (systemQrConfig) {
    const systemQr = await createSystemQrInvoice(
      {
        merchantCode: systemQrConfig.merchantCode,
        amount: params.amount,
        referenceNumber: params.orderId,
        webhook: getStoreQPayCallbackUrl(params.orderId),
      },
      systemQrConfig.username,
      systemQrConfig.password,
    );

    return {
      data: {
        invoice_id: systemQr.invoiceId,
        qr_text: systemQr.qrText,
        qr_image: "",
        urls: systemQr.urls,
      },
      rawPayload: {
        provider: "SYSTEMQR",
        merchantCode: systemQrConfig.merchantCode,
        invoice_id: systemQr.invoiceId,
        qr_text: systemQr.qrText,
        qr_image: "",
        urls: systemQr.urls,
      },
    };
  }

  const merchantRes = await getVendorMerchantConfig(
    params.organizationId,
    "POS",
  );
  if (!merchantRes.success || !merchantRes.config) {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.MGL_LOCAL_DEV === "true"
    ) {
      const invoiceId = `DEV-QPAY-${params.orderId}`;
      const qrText = `mglstore://local-payment?orderId=${encodeURIComponent(
        params.orderId,
      )}&amount=${params.amount}`;
      return {
        data: {
          invoice_id: invoiceId,
          qr_text: qrText,
          qr_image: "",
          urls: [],
        },
        rawPayload: {
          provider: "LOCAL_DEV",
          invoice_id: invoiceId,
          qr_text: qrText,
          qr_image: "",
          urls: [],
        },
      };
    }
    throw new Error("QPAY_NOT_CONFIGURED");
  }

  const qpayData = await createQPayInvoice({
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    amount: params.amount,
    merchantContext: merchantRes.config,
  });

  return {
    data: qpayData,
    rawPayload: {
      provider: "QPAY",
      invoice_id: qpayData.invoice_id,
      qr_text: qpayData.qr_text,
      qr_image: qpayData.qr_image,
      urls: qpayData.urls,
    },
  };
}

async function hasSellerStorePaymentConfig(organizationId: string) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.MGL_LOCAL_DEV === "true"
  ) {
    return true;
  }
  const systemQrConfig = await getVendorSystemQrConfig(organizationId, "POS");
  if (systemQrConfig) return true;
  const merchantResult = await getVendorMerchantConfig(organizationId, "POS");
  return Boolean(merchantResult.success && merchantResult.config);
}

async function checkStorePayment(params: {
  organizationId: string;
  providerRef: string;
  rawPayload?: unknown;
}) {
  const rawPayload = asRecord(params.rawPayload);
  const provider = String(rawPayload.provider || "").toUpperCase();

  if (provider === "SYSTEMQR") {
    const resolved = await getVendorSystemQrConfig(params.organizationId);
    const legacyAccount =
      String(rawPayload.source || "").toUpperCase() === "ADMIN_PAYMENT_ACCOUNT"
        ? await getLegacyStorePaymentAccount(
            String(rawPayload.merchantCode || "").trim(),
          )
        : null;
    const merchantCode = String(
      rawPayload.merchantCode ||
        legacyAccount?.merchantCode ||
        resolved?.merchantCode ||
        "",
    ).trim();
    if (!merchantCode)
      return {
        paid: false,
        payload: { provider: "SYSTEMQR", missingMerchantCode: true },
      };

    const check = await checkSystemQrPayment(
      { merchantCode, invoiceNumber: params.providerRef },
      String(legacyAccount?.username || resolved?.username || "").trim() ||
        undefined,
      String(legacyAccount?.password || resolved?.password || "").trim() ||
        undefined,
    );

    return {
      paid: check.paid,
      payload: { provider: "SYSTEMQR", merchantCode, ...check },
    };
  }

  const merchantRes = await getVendorMerchantConfig(params.organizationId);
  const qpayCheck = await checkQPayPayment(
    params.providerRef,
    merchantRes.config ?? undefined,
  );

  return {
    paid: qpayCheck.count > 0,
    payload: qpayCheck,
  };
}

const DISPATCH_WINDOW_SECONDS = 10;
const DISPATCH_RADIUS_ZONES_KM = [2, 5, 10, 20] as const;

const toNumberOrNull = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const distanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

async function seedOrderDispatchRadar(
  tx: any,
  order: {
    id: string;
    organizationId: string;
    customerLat: number | null;
    customerLng: number | null;
  },
) {
  const existing = await tx.orderDispatchAttempt.count({
    where: { orderId: order.id },
  });
  if (existing > 0) return;
  if (order.customerLat === null || order.customerLng === null) return;

  const branches: {
    id: string;
    organizationId: string;
    lat: number | null;
    lng: number | null;
    createdAt: Date;
  }[] = await tx.branch.findMany({
    where: {
      organizationId: order.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      organizationId: true,
      lat: true,
      lng: true,
      createdAt: true,
    },
  });

  if (branches.length === 0) return;

  const ranked: {
    branchId: string;
    organizationId: string;
    distanceKm: number;
    createdAt: Date;
    zone: number;
  }[] = branches
    .filter((branch) => branch.lat !== null && branch.lng !== null)
    .map((branch) => {
      const branchDistanceKm = distanceKm(
        order.customerLat!,
        order.customerLng!,
        branch.lat!,
        branch.lng!,
      );
      return {
        branchId: branch.id,
        organizationId: branch.organizationId,
        distanceKm: branchDistanceKm,
        createdAt: branch.createdAt,
        zone:
          DISPATCH_RADIUS_ZONES_KM.findIndex(
            (radiusKm) => branchDistanceKm <= radiusKm,
          ) + 1,
      };
    })
    .filter((branch) => branch.zone > 0)
    .sort((a, b) => {
      if (a.zone !== b.zone) return a.zone - b.zone;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const firstZone = ranked[0]?.zone;
  if (!firstZone) return;

  const expiresAt = new Date(Date.now() + DISPATCH_WINDOW_SECONDS * 1000);
  await tx.orderDispatchAttempt.createMany({
    data: ranked.map((branch) => ({
      orderId: order.id,
      branchId: branch.branchId,
      organizationId: branch.organizationId,
      sequence: branch.zone,
      distanceKm: branch.distanceKm,
      status:
        branch.zone === firstZone
          ? OrderDispatchAttemptStatus.PENDING
          : OrderDispatchAttemptStatus.QUEUED,
      expiresAt: branch.zone === firstZone ? expiresAt : null,
    })),
    skipDuplicates: true,
  });
}

type CheckoutOrderPaymentContext = {
  id: string;
  orderNumber: string;
  customerId: string;
  organizationId: string;
  status?: string;
  customerLat?: number | null;
  customerLng?: number | null;
};

async function confirmPaidOrderAndCreateDelivery(
  order: CheckoutOrderPaymentContext,
  paymentId: string,
  rawPayload: unknown,
  note: string,
) {
  const confirmed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: { not: OrderStatus.CANCELLED },
        paymentStatus: PaymentStatus.PENDING,
      },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED,
      },
    });

    // QPay callback and browser polling can arrive together. Only the request
    // that atomically claims the unpaid order may deduct stock and create work.
    if (claimed.count === 0) return null;

    await tx.paymentAttempt.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        rawPayload: JSON.parse(JSON.stringify(rawPayload)),
      },
    });

    await decrementOrderStock(tx, order.id, order.customerId);

    const previousStatus =
      (order.status as OrderStatus | undefined) ?? OrderStatus.PENDING;
    if (previousStatus !== OrderStatus.CONFIRMED) {
      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus: OrderStatus.CONFIRMED,
          changedById: order.customerId,
          note,
        },
      });
    }

    return { paid: true };
  });
  if (confirmed) {
    await notifyNewPaidOrder(order.id).catch((error: unknown) => {
      console.error("Paid order notification failed", error);
    });
  }
}

async function decrementOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  customerId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      organizationId: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          product: { select: { supplyType: true } },
        },
      },
    },
  });
  if (!order) return;

  for (const item of order.items) {
    if (item.product?.supplyType === "CHINA_PREORDER") continue;
    const warehouseId = await resolveOrgWarehouse(
      tx,
      order.organizationId,
      item.productId,
    );
    await adjustStock(tx, {
      productId: item.productId,
      warehouseId: warehouseId ?? undefined,
      change: -item.quantity,
      reason: InventoryReason.ORDER,
      note: "Онлайн захиалга төлбөр баталгаажсан",
      createdById: customerId,
      referenceId: orderId,
      referenceType: "ORDER",
    });
  }
}
/* ══════════════════════════════════════════════════════════
   POST /store/checkout
   Creates an Order + OrderItems + QPay mock invoice.
   Body: { lines: [{productId,qty}], phone, email?, note?, shippingAddress? }
   ══════════════════════════════════════════════════════════ */
router.post("/store/checkout", async (req: Request, res: Response) => {
  try {
    const customer = await getCustomer(req);
    if (!customer || !customer.isActive || customer.deletedAt) {
      return res.status(401).json({ message: "Нэвтэрнэ үү" });
    }

    const {
      lines,
      phone,
      email,
      secondaryPhone,
      note,
      shippingAddress,
      customerLat,
      customerLng,
    } = req.body as {
      lines?: {
        productId: string;
        qty: number;
        devProduct?: {
          name?: string;
          price?: number;
          supplyType?: "IN_STOCK" | "CHINA_PREORDER";
        };
      }[];
      phone?: string;
      email?: string;
      secondaryPhone?: string;
      note?: string;
      shippingAddress?: string;
      customerLat?: number | string;
      customerLng?: number | string;
    };

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: "Сагс хоосон байна" });
    }

    const normalizedPhone = phone?.trim();
    if (!normalizedPhone) {
      return res.status(400).json({
        message: "Захиалга баталгаажуулах утасны дугаар шаардлагатай.",
      });
    }
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedNote = note?.trim();
    const normalizedSecondaryPhone = secondaryPhone?.trim();
    const noteAlreadyIncludesEmail = Boolean(
      normalizedEmail &&
      normalizedNote?.toLowerCase().includes(normalizedEmail),
    );
    const orderNote = [
      normalizedEmail && !noteAlreadyIncludesEmail
        ? `Имэйл: ${normalizedEmail}`
        : null,
      normalizedNote,
      normalizedSecondaryPhone
        ? `Нэмэлт дугаар: ${normalizedSecondaryPhone}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Validate all products exist and are active
    const productIds = lines.map((l) => l.productId);
    let products = await prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        stock: true,
        supplyType: true,
        preorderCapacity: true,
        preorderCycleStartedAt: true,
        organizationId: true,
        managedByWarehouseId: true,
        warehouseInventories: {
          select: {
            warehouseId: true,
            quantity: true,
          },
        },
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true },
          take: 1,
        },
      },
    });

    const foundProductIds = new Set(products.map((product) => product.id));
    const missingLines = lines.filter(
      (line) => !foundProductIds.has(line.productId),
    );
    const canMaterializeDevProducts =
      process.env.MGL_LOCAL_DEV === "true" &&
      missingLines.length > 0 &&
      missingLines.every(
        (line) =>
          line.productId.startsWith("local-product-") &&
          line.devProduct?.name?.trim() &&
          Number.isFinite(Number(line.devProduct.price)) &&
          Number(line.devProduct.price) >= 0,
      );

    if (canMaterializeDevProducts) {
      const testOrganization = await prisma.organization.findFirst({
        where: {
          status: "ACTIVE",
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!testOrganization) {
        return res.status(409).json({
          code: "DEV_TEST_ORGANIZATION_REQUIRED",
          message:
            "Тест захиалга үүсгэх идэвхтэй байгууллага database-д алга байна.",
        });
      }

      await prisma.$transaction(
        missingLines.map((line) =>
          prisma.product.upsert({
            where: { id: line.productId },
            create: {
              id: line.productId,
              organizationId: testOrganization.id,
              name: line.devProduct!.name!.trim().slice(0, 200),
              description: "Local development checkout test product",
              sku: `DEV-${line.productId}`.slice(0, 100),
              price: Number(line.devProduct!.price),
              stock: 10_000,
              supplyType:
                line.devProduct?.supplyType === "CHINA_PREORDER"
                  ? "CHINA_PREORDER"
                  : "IN_STOCK",
              isActive: true,
              reviewStatus: "APPROVED",
            },
            update: {
              organizationId: testOrganization.id,
              name: line.devProduct!.name!.trim().slice(0, 200),
              price: Number(line.devProduct!.price),
              stock: 10_000,
              supplyType:
                line.devProduct?.supplyType === "CHINA_PREORDER"
                  ? "CHINA_PREORDER"
                  : "IN_STOCK",
              isActive: true,
              deletedAt: null,
              reviewStatus: "APPROVED",
            },
            select: { id: true },
          }),
        ),
      );

      products = await prisma.product.findMany({
        where: { id: { in: productIds }, deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true,
          supplyType: true,
          preorderCapacity: true,
          preorderCycleStartedAt: true,
          organizationId: true,
          managedByWarehouseId: true,
          warehouseInventories: {
            select: {
              warehouseId: true,
              quantity: true,
            },
          },
          discounts: {
            where: { isActive: true, validUntil: { gte: new Date() } },
            select: { percent: true },
            take: 1,
          },
        },
      });
    }

    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ message: "Зарим бараа олдсонгүй эсвэл идэвхгүй байна" });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const pricingAudience = {
      isMember: isActiveMember(customer),
      isStoreOwner: customer.organizationMemberships.length > 0,
    };

    // Validate stock & build order items
    let subtotal = 0;
    const orderItemsData: {
      productId: string;
      quantity: number;
      price: number;
      subtotal: number;
      productName: string;
      productSku: string | null;
    }[] = [];

    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product) {
        return res
          .status(400)
          .json({ message: `Бараа олдсонгүй: ${line.productId}` });
      }
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
      const isPreorder = product.supplyType === "CHINA_PREORDER";
      const warehouseStock =
        product.warehouseInventories.length > 0
          ? product.warehouseInventories.reduce(
              (total, inventory) => total + Math.max(0, inventory.quantity),
              0,
            )
          : product.stock;
      if (!isPreorder && warehouseStock < qty) {
        return res.status(400).json({
          code: "INSUFFICIENT_STOCK",
          productId: product.id,
          availableStock: warehouseStock,
          requestedQuantity: qty,
          message: `${product.name} барааны нөөц хүрэлцэхгүй (${warehouseStock} ширхэг)`,
        });
      }
      const basePrice = Number(product.price);
      const price = resolveMarketplaceProductPricing(basePrice, {
        ...pricingAudience,
        supplyType: product.supplyType,
        memberDiscountPercent: product.discounts[0]?.percent,
      }).price;
      const lineTotal = price * qty;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        quantity: qty,
        price,
        subtotal: lineTotal,
        productName: product.name,
        productSku: product.sku,
      });
    }

    const orgIds = [...new Set(products.map((p) => p.organizationId))];
    const organizationGroups = orgIds.map((organizationId) => {
      const groupProducts = products.filter(
        (product) => product.organizationId === organizationId,
      );
      const groupProductIds = new Set(
        groupProducts.map((product) => product.id),
      );
      const items = orderItemsData.filter((item) =>
        groupProductIds.has(item.productId),
      );
      return {
        organizationId,
        items,
        subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
        isPreorderOnly: groupProducts.every(
          (product) => product.supplyType === "CHINA_PREORDER",
        ),
      };
    });

    const normalizedCustomerLat = toNumberOrNull(customerLat);
    const normalizedCustomerLng = toNumberOrNull(customerLng);
    const hasCustomerCoordinates =
      normalizedCustomerLat !== null && normalizedCustomerLng !== null;
    const total = subtotal; // no delivery fee for now
    const isPreorderOnlyCheckout = products.every(
      (product) => product.supplyType === "CHINA_PREORDER",
    );

    if (
      !isPreorderOnlyCheckout &&
      STORE_MINIMUM_ORDER_AMOUNT > 0 &&
      total < STORE_MINIMUM_ORDER_AMOUNT
    ) {
      return res.status(400).json({
        code: "MINIMUM_ORDER_AMOUNT",
        message: `Захиалгын доод дүн ${STORE_MINIMUM_ORDER_AMOUNT.toLocaleString()}₮ байна.`,
        minimumAmount: STORE_MINIMUM_ORDER_AMOUNT,
        currentAmount: total,
        remainingAmount: STORE_MINIMUM_ORDER_AMOUNT - total,
      });
    }

    const sellerPaymentReadiness = await Promise.all(
      orgIds.map(async (organizationId) => ({
        organizationId,
        configured: await hasSellerStorePaymentConfig(organizationId),
      })),
    );
    const unconfiguredSellerIds = sellerPaymentReadiness
      .filter((seller) => !seller.configured)
      .map((seller) => seller.organizationId);
    if (unconfiguredSellerIds.length > 0) {
      return res.status(409).json({
        code: "SELLER_PAYMENT_NOT_CONFIGURED",
        message:
          "Бараа нийлүүлэгч төлбөр хүлээн авах QR дансаа холбоогүй байна. Данс холбогдсоны дараа захиалга өгөх боломжтой.",
        organizationIds: unconfiguredSellerIds,
      });
    }

    // One customer checkout is split atomically into one order per store.
    const createdOrders = await prisma.$transaction(async (tx) => {
      const limitedPreorders = products
        .filter(
          (product) =>
            product.supplyType === "CHINA_PREORDER" &&
            product.preorderCapacity !== null,
        )
        .sort((a, b) => a.id.localeCompare(b.id));

      // Serialize checkout for each limited preorder so concurrent requests
      // cannot take the same final participant slot.
      for (const product of limitedPreorders) {
        await tx.$queryRaw<Array<{ locked: number }>>`
          SELECT 1 AS locked
          FROM pg_advisory_xact_lock(hashtext(${`preorder-capacity:${product.id}`}))
        `;
      }

      const currentPreorderCycles = await tx.product.findMany({
        where: { id: { in: limitedPreorders.map((product) => product.id) } },
        select: { id: true, preorderCycleStartedAt: true },
      });

      const preorderParticipants = await getPreorderParticipantIds(
        tx,
        limitedPreorders.map((product) => product.id),
        new Map(
          currentPreorderCycles.map((product) => [
            product.id,
            product.preorderCycleStartedAt,
          ]),
        ),
      );
      for (const product of limitedPreorders) {
        const participantCount =
          preorderParticipants.get(product.id)?.size ?? 0;
        if (participantCount >= (product.preorderCapacity ?? 0)) {
          throw new PreorderCapacityFullError(product.name);
        }
      }

      const results = [];
      for (const group of organizationGroups) {
        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            organizationId: group.organizationId,
            customerId: customer.id,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            paymentMethod: PaymentMethod.QPAY,
            shippingAddress:
              shippingAddress ||
              (group.isPreorderOnly ? "Урьдчилсан захиалга" : ""),
            phone: normalizedPhone,
            note: orderNote || null,
            customerLat: normalizedCustomerLat,
            customerLng: normalizedCustomerLng,
            subtotal: group.subtotal,
            total: group.subtotal,
            items: { create: group.items },
            history: {
              create: {
                toStatus: OrderStatus.PENDING,
                changedById: customer.id,
                note: group.isPreorderOnly
                  ? "Урьдчилсан захиалга бүртгэгдсэн"
                  : !hasCustomerCoordinates
                    ? "Захиалга бүртгэгдсэн. Байршлын координатгүй тул гараар хуваарилна"
                    : "Захиалга үүсгэж, ойр салбар хайж эхэлсэн",
              },
            },
          },
          include: { items: true },
        });

        if (!group.isPreorderOnly && hasCustomerCoordinates) {
          await seedOrderDispatchRadar(tx, {
            id: order.id,
            organizationId: order.organizationId,
            customerLat: order.customerLat,
            customerLng: order.customerLng,
          });
        }
        results.push({ order, isPreorderOnly: group.isPreorderOnly });
      }
      return results;
    });

    const orderResults = await Promise.all(
      createdOrders.map(async ({ order, isPreorderOnly }) => ({
        order,
        isPreorderOnly,
        dispatch:
          !isPreorderOnly && hasCustomerCoordinates
            ? await getCheckoutDispatchSnapshot(order.id, customer.id)
            : null,
      })),
    );
    const primary = orderResults[0];
    if (!primary) {
      throw new Error("Checkout created no orders");
    }
    const dispatch = primary.dispatch;
    const dispatchStatus =
      orderResults.length > 1
        ? "MULTI_ORDER_CREATED"
        : !primary.isPreorderOnly && !hasCustomerCoordinates
          ? "MANUAL_REVIEW"
          : dispatch?.status === "NOT_STARTED" && !primary.isPreorderOnly
            ? "MANUAL_REVIEW"
            : dispatch?.status || "PREORDER_REGISTERED";

    await Promise.all(
      orderResults.map(({ order, isPreorderOnly, dispatch }) =>
        notifyNewOnlineOrderRequest(order.id, {
          pickupRequired:
            !isPreorderOnly &&
            (!dispatch ||
              dispatch.status === "NO_BRANCH_AVAILABLE" ||
              dispatch.attempts.length === 0),
        }).catch((error: unknown) => {
          console.error("Online order request notification failed", {
            orderId: order.id,
            error,
          });
        }),
      ),
    );

    return res.status(201).json({
      orderId: primary.order.id,
      orderNumber: primary.order.orderNumber,
      orderCount: orderResults.length,
      orders: orderResults.map(({ order, isPreorderOnly, dispatch }) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId: order.organizationId,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        preorderOrder: isPreorderOnly,
        dispatchStatus:
          !isPreorderOnly && !hasCustomerCoordinates
            ? "MANUAL_REVIEW"
            : dispatch?.status || "PREORDER_REGISTERED",
      })),
      total,
      subtotal,
      paymentId: null,
      paymentRequired: false,
      dispatchStatus,
      preorderOrder: orderResults.every((result) => result.isPreorderOnly),
      dispatch,
      items: orderResults.flatMap(({ order }) =>
        order.items.map((item) => ({
          productId: item.productId,
          name: item.productName,
          qty: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.subtotal),
        })),
      ),
    });
  } catch (error) {
    if (error instanceof PreorderCapacityFullError) {
      return res.status(409).json({
        code: "PREORDER_CAPACITY_FULL",
        message: error.message,
      });
    }
    console.error("store checkout error", error);
    return res.status(500).json({ message: "Захиалга үүсгэхэд алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /store/checkout/:orderId/dispatch-status
   Customer-facing radar status before payment is enabled.
   ══════════════════════════════════════════════════════════ */
router.get(
  "/store/checkout/:orderId/dispatch-status",
  async (req: Request, res: Response) => {
    try {
      const customer = await getCustomer(req);
      if (!customer || !customer.isActive || customer.deletedAt) {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }

      const snapshot = await getCheckoutDispatchSnapshot(
        req.params.orderId,
        customer.id,
      );
      if (!snapshot) {
        return res
          .status(404)
          .json({ message: "Захиалгын хүргэлтийн төлөв олдсонгүй" });
      }

      return res.json(snapshot);
    } catch (error) {
      console.error("store dispatch status error", error);
      return res
        .status(500)
        .json({ message: "Хүргэлтийн төлөв шалгахад алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   POST /store/checkout/:orderId/cancel
   Cancel a customer order while branch dispatch is still searching.
   ══════════════════════════════════════════════════════════ */
router.post(
  "/store/checkout/:orderId/cancel",
  async (req: Request, res: Response) => {
    try {
      const customer = await getCustomer(req);
      if (!customer || !customer.isActive || customer.deletedAt) {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }

      const { orderId } = req.params;
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
          status: true,
          paymentStatus: true,
        },
      });

      if (!order)
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      if (order.customerId !== customer.id) {
        return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
      }
      if (order.paymentStatus === PaymentStatus.PAID) {
        return res.status(409).json({
          message: "Төлбөр төлөгдсөн захиалгыг эндээс цуцлах боломжгүй.",
        });
      }
      if (order.status === OrderStatus.CANCELLED) {
        return res.json({
          message: "Захиалга аль хэдийн цуцлагдсан",
          status: OrderStatus.CANCELLED,
        });
      }

      await prisma.$transaction([
        prisma.orderDispatchAttempt.updateMany({
          where: {
            orderId,
            status: {
              in: [
                OrderDispatchAttemptStatus.QUEUED,
                OrderDispatchAttemptStatus.PENDING,
              ],
            },
          },
          data: {
            status: OrderDispatchAttemptStatus.CANCELLED,
            respondedAt: new Date(),
            note: "Хэрэглэгч захиалгыг цуцалсан",
          },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELLED,
          },
        }),
        prisma.delivery.updateMany({
          where: {
            orderId,
            status: { not: DeliveryStatus.COMPLETED },
          },
          data: {
            status: DeliveryStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        }),
        prisma.orderHistory.create({
          data: {
            orderId,
            fromStatus: order.status as OrderStatus,
            toStatus: OrderStatus.CANCELLED,
            changedById: customer.id,
            note: "Хэрэглэгч хүргэлтийн хайлтын үед захиалгыг цуцалсан",
          },
        }),
      ]);

      return res.json({
        message: "Захиалга цуцлагдлаа",
        status: OrderStatus.CANCELLED,
      });
    } catch (error) {
      console.error("store checkout cancel error", error);
      return res
        .status(500)
        .json({ message: "Захиалга цуцлахад алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   POST /store/checkout/:orderId/payment
   Create MinuPOS/SystemQR invoice only after a branch accepts the radar request.
   ══════════════════════════════════════════════════════════ */
router.post(
  "/store/checkout/:orderId/payment",
  async (req: Request, res: Response) => {
    try {
      const customer = await getCustomer(req);
      if (!customer || !customer.isActive || customer.deletedAt) {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }

      const { orderId } = req.params;
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: { supplyType: true },
              },
            },
          },
          payments: {
            where: { method: PaymentMethod.QPAY },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          delivery: {
            select: {
              courierId: true,
              providerOrganizationId: true,
            },
          },
        },
      });

      if (!order)
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      if (order.customerId !== customer.id) {
        return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
      }
      if (order.paymentStatus === PaymentStatus.PAID) {
        return res
          .status(400)
          .json({ message: "Төлбөр аль хэдийн төлөгдсөн байна" });
      }

      const existing = order.payments[0];
      if (existing?.providerRef && existing.rawPayload) {
        const raw = existing.rawPayload as any;
        return res.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: Number(order.total),
          subtotal: Number(order.subtotal),
          paymentId: existing.id,
          qrText: raw.qr_text || "",
          qrImage: raw.qr_image || "",
          qpayInvoiceId: raw.invoice_id || existing.providerRef,
          deepLinks: raw.urls || [],
          expiresIn: STORE_CHECKOUT_PAYMENT_TIMEOUT_MS / 1000,
          items: order.items.map((i) => ({
            productId: i.productId,
            name: i.productName,
            qty: i.quantity,
            price: Number(i.price),
            subtotal: Number(i.subtotal),
          })),
        });
      }

      const payment =
        existing ??
        (await prisma.paymentAttempt.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.QPAY,
            status: PaymentStatus.PENDING,
            amount: Number(order.total),
          },
        }));

      let invoice;
      try {
        invoice = await createStorePaymentInvoice({
          organizationId: order.organizationId,
          orderId,
          orderNumber: order.orderNumber,
          amount: Number(order.total),
        });
      } catch (err) {
        console.error("Store payment invoice creation failed:", err);
        if (err instanceof Error && err.message === "QPAY_NOT_CONFIGURED") {
          return res.status(400).json({
            message: "Дэлгүүр MinuPOS төлбөрийн тохиргоо холбоогүй байна.",
          });
        }
        return res
          .status(502)
          .json({ message: "Төлбөрийн нэхэмжлэх үүсгэхэд алдаа гарлаа" });
      }

      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: {
          providerRef: invoice.data.invoice_id,
          rawPayload: JSON.parse(JSON.stringify(invoice.rawPayload)),
        },
      });

      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        paymentId: payment.id,
        qrText: invoice.data.qr_text,
        qrImage: invoice.data.qr_image,
        qpayInvoiceId: invoice.data.invoice_id,
        deepLinks: invoice.data.urls,
        expiresIn: STORE_CHECKOUT_PAYMENT_TIMEOUT_MS / 1000,
        items: order.items.map((i) => ({
          productId: i.productId,
          name: i.productName,
          qty: i.quantity,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      });
    } catch (error) {
      console.error("store payment create error", error);
      return res.status(500).json({ message: "Төлбөр үүсгэхэд алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   POST /store/checkout/:orderId/confirm
   Check checkout payment status and confirm if paid.
   ══════════════════════════════════════════════════════════ */
router.post(
  "/store/checkout/:orderId/confirm",
  async (req: Request, res: Response) => {
    try {
      await cancelExpiredStoreCheckouts();
      const customer = await getCustomer(req);
      if (!customer || !customer.isActive || customer.deletedAt) {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }

      const { orderId } = req.params;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
          organizationId: true,
          status: true,
          customerLat: true,
          customerLng: true,
          paymentStatus: true,
          orderNumber: true,
          total: true,
          payments: {
            where: { method: PaymentMethod.QPAY },
            select: {
              id: true,
              providerRef: true,
              rawPayload: true,
              status: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      }

      if (order.customerId !== customer.id) {
        return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
      }

      if (order.paymentStatus === "PAID") {
        return res.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "PAID",
          message: "Төлбөр аль хэдийн төлөгдсөн",
        });
      }
      if (
        order.status === OrderStatus.CANCELLED ||
        order.paymentStatus === PaymentStatus.CANCELLED
      ) {
        return res.status(410).json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "CANCELLED",
          message: "Төлбөрийн хугацаа дууссан тул захиалга цуцлагдсан",
        });
      }

      // Check payment via invoiceId.
      const payment = order.payments[0];
      if (!payment?.providerRef) {
        return res
          .status(400)
          .json({ message: "Төлбөрийн нэхэмжлэх олдсонгүй" });
      }

      const paymentCheck = await checkStorePayment({
        organizationId: order.organizationId,
        providerRef: payment.providerRef,
        rawPayload: payment.rawPayload,
      });

      if (!paymentCheck.paid) {
        return res.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "PENDING",
          message: "Төлбөр хүлээгдэж байна",
        });
      }

      await confirmPaidOrderAndCreateDelivery(
        order,
        payment.id,
        paymentCheck.payload,
        "MinuPOS төлбөр амжилттай",
      );

      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "PAID",
        message: "Төлбөр амжилттай",
      });
    } catch (error) {
      console.error("store confirm error", error);
      return res
        .status(500)
        .json({ message: "Төлбөр баталгаажуулахад алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   GET /store/checkout/:orderId/payment-status
   Polling endpoint — check checkout payment status.
   ══════════════════════════════════════════════════════════ */
router.get(
  "/store/checkout/:orderId/payment-status",
  async (req: Request, res: Response) => {
    try {
      await cancelExpiredStoreCheckouts();
      const customer = await getCustomer(req);
      if (!customer || !customer.isActive || customer.deletedAt) {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }

      const { orderId } = req.params;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
          organizationId: true,
          status: true,
          customerLat: true,
          customerLng: true,
          paymentStatus: true,
          orderNumber: true,
          payments: {
            where: { method: PaymentMethod.QPAY },
            select: {
              id: true,
              providerRef: true,
              rawPayload: true,
              status: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      }
      if (order.customerId !== customer.id) {
        return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
      }

      // Already paid
      if (order.paymentStatus === "PAID") {
        return res.json({ status: "PAID" });
      }
      if (
        order.status === OrderStatus.CANCELLED ||
        order.paymentStatus === PaymentStatus.CANCELLED
      ) {
        return res.json({ status: "CANCELLED" });
      }

      const payment = order.payments[0];
      if (!payment?.providerRef) {
        return res.json({ status: "PENDING" });
      }

      const paymentCheck = await checkStorePayment({
        organizationId: order.organizationId,
        providerRef: payment.providerRef,
        rawPayload: payment.rawPayload,
      });

      if (!paymentCheck.paid) {
        return res.json({ status: "PENDING" });
      }

      await confirmPaidOrderAndCreateDelivery(
        order,
        payment.id,
        paymentCheck.payload,
        "MinuPOS төлбөр амжилттай (auto-poll)",
      );

      return res.json({ status: "PAID" });
    } catch (error) {
      console.error("payment-status error", error);
      return res.status(500).json({ message: "Төлбөр шалгахад алдаа гарлаа" });
    }
  },
);

/* Local development only: confirm a pending checkout without a payment provider. */
router.post(
  "/store/checkout/:orderId/dev-confirm",
  async (req: Request, res: Response) => {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.MGL_LOCAL_DEV !== "true"
    ) {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      const customer = await getCustomer(req);
      if (!customer || !customer.isActive || customer.deletedAt) {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }

      const order = await prisma.order.findUnique({
        where: { id: req.params.orderId },
        select: {
          id: true,
          customerId: true,
          organizationId: true,
          status: true,
          customerLat: true,
          customerLng: true,
          paymentStatus: true,
          orderNumber: true,
          total: true,
          payments: {
            where: { method: PaymentMethod.QPAY },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true },
          },
        },
      });
      if (!order) {
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      }
      if (order.customerId !== customer.id) {
        return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
      }
      if (order.status === OrderStatus.CANCELLED) {
        return res.status(410).json({ message: "Захиалга цуцлагдсан байна" });
      }
      if (order.paymentStatus === PaymentStatus.PAID) {
        return res.json({ status: "PAID" });
      }

      const payment =
        order.payments[0] ??
        (await prisma.paymentAttempt.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.QPAY,
            status: PaymentStatus.PENDING,
            amount: Number(order.total),
            providerRef: `DEV-${order.id}`,
          },
          select: { id: true, status: true },
        }));

      await confirmPaidOrderAndCreateDelivery(
        order,
        payment.id,
        {
          provider: "LOCAL_DEV",
          transactionId: `DEV-QPAY-${Date.now()}`,
          confirmedBy: customer.id,
        },
        "Local development төлбөр баталгаажсан",
      );

      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "PAID",
      });
    } catch (error) {
      console.error("store dev payment confirm error", error);
      return res
        .status(500)
        .json({ message: "Dev төлбөр баталгаажуулахад алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   POST /store/qpay/callback
   QPay webhook callback — called by QPay when payment succeeds.
   Query: ?orderId=xxx
   ══════════════════════════════════════════════════════════ */
router.post("/store/qpay/callback", async (req: Request, res: Response) => {
  try {
    await cancelExpiredStoreCheckouts();
    const orderId = req.query.orderId as string;
    if (!orderId) {
      return res.status(400).json({ message: "orderId required" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        organizationId: true,
        status: true,
        customerLat: true,
        customerLng: true,
        paymentStatus: true,
        orderNumber: true,
        payments: {
          where: { method: PaymentMethod.QPAY },
          select: {
            id: true,
            providerRef: true,
            rawPayload: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "PAID") {
      return res.json({ message: "already paid" });
    }
    if (
      order.status === OrderStatus.CANCELLED ||
      order.paymentStatus === PaymentStatus.CANCELLED
    ) {
      return res.status(410).json({ message: "order payment expired" });
    }

    const payment = order.payments[0];
    if (!payment?.providerRef) {
      return res.status(400).json({ message: "no provider ref" });
    }

    // Verify with the QPay profile used when the invoice was created.
    const paymentCheck = await checkStorePayment({
      organizationId: order.organizationId,
      providerRef: payment.providerRef,
      rawPayload: payment.rawPayload,
    });

    if (!paymentCheck.paid) {
      return res.json({ message: "not yet paid" });
    }

    await confirmPaidOrderAndCreateDelivery(
      order,
      payment.id,
      paymentCheck.payload,
      "QPay callback — төлбөр амжилттай",
    );

    return res.json({ message: "success" });
  } catch (error) {
    console.error("qpay callback error", error);
    return res.status(500).json({ message: "callback error" });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /store/orders
   Customer's order history.
   ══════════════════════════════════════════════════════════ */
router.get("/store/orders", async (req: Request, res: Response) => {
  try {
    const customer = await getCustomer(req);
    if (!customer || !customer.isActive || customer.deletedAt) {
      return res.status(401).json({ message: "Нэвтэрнэ үү" });
    }

    const from =
      typeof req.query.from === "string" ? new Date(req.query.from) : null;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : null;
    const createdAt =
      (from && !Number.isNaN(from.getTime())) ||
      (to && !Number.isNaN(to.getTime()))
        ? {
            ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
            ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
          }
        : undefined;

    const orders = await prisma.order.findMany({
      where: {
        customerId: customer.id,
        deletedAt: null,
        ...(createdAt ? { createdAt } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            price: true,
            subtotal: true,
            review: { select: { score: true } },
            product: {
              select: {
                description: true,
                sku: true,
                unit: true,
                supplyType: true,
                images: {
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            method: true,
            status: true,
            amount: true,
            providerRef: true,
            paidAt: true,
            refundedAt: true,
            cancelledAt: true,
            createdAt: true,
          },
        },
        organization: { select: { name: true } },
        branch: {
          select: { id: true, name: true, address: true, lat: true, lng: true },
        },
        dispatchAttempts: {
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            status: true,
            sequence: true,
            distanceKm: true,
            requestedAt: true,
            respondedAt: true,
            branch: { select: { id: true, name: true, address: true } },
          },
        },
        delivery: {
          select: {
            courierId: true,
            providerOrganizationId: true,
          },
        },
      },
    });

    return res.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentReady:
          o.paymentStatus === PaymentStatus.PENDING &&
          o.status !== OrderStatus.CANCELLED,
        paymentMethod: o.paymentMethod,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.deliveryFee),
        discountAmount: Number(o.discountAmount),
        deliveryCode: o.deliveryCode,
        phone: o.phone,
        shippingAddress: o.shippingAddress,
        organizationName: o.organization.name,
        branch: o.branch
          ? {
              id: o.branch.id,
              name: o.branch.name,
              address: o.branch.address,
              lat: o.branch.lat,
              lng: o.branch.lng,
            }
          : null,
        dispatch: {
          status: o.branch
            ? "ACCEPTED"
            : o.dispatchAttempts.some((a) => a.status === "PENDING")
              ? "SEARCHING"
              : o.dispatchAttempts.some((a) => a.status === "QUEUED")
                ? "QUEUED"
                : o.dispatchAttempts.length > 0
                  ? "NO_BRANCH_AVAILABLE"
                  : "NOT_STARTED",
          attempts: o.dispatchAttempts.map((a) => ({
            id: a.id,
            status: a.status,
            sequence: a.sequence,
            distanceKm: a.distanceKm,
            requestedAt: a.requestedAt.toISOString(),
            respondedAt: a.respondedAt?.toISOString() || null,
            branch: a.branch,
          })),
        },
        createdAt: o.createdAt.toISOString(),
        payments: o.payments.map((payment) => ({
          id: payment.id,
          method: payment.method,
          status: payment.status,
          amount: Number(payment.amount),
          providerRef: payment.providerRef,
          paidAt: payment.paidAt?.toISOString() || null,
          refundedAt: payment.refundedAt?.toISOString() || null,
          cancelledAt: payment.cancelledAt?.toISOString() || null,
          createdAt: payment.createdAt.toISOString(),
        })),
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          name: i.productName,
          qty: i.quantity,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
          reviewScore: i.review?.score ?? null,
          description: i.product.description,
          sku: i.product.sku,
          unit: i.product.unit,
          imageUrl: i.product.images[0]?.url ?? null,
        })),
        requiresReview:
          o.status === OrderStatus.COMPLETED &&
          o.items.some((item) => !item.review),
      })),
    });
  } catch (error) {
    console.error("store orders error", error);
    return res
      .status(500)
      .json({ message: "Захиалгын жагсаалт авахад алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /store/orders/:orderId/reviews
   One order-level score is copied to every line item.
   ══════════════════════════════════════════════════════════ */
router.post(
  "/store/orders/:orderId/reviews",
  async (req: Request, res: Response) => {
    try {
      const customer = await getCustomer(req);
      if (!customer || !customer.isActive || customer.deletedAt) {
        return res.status(401).json({ message: "Нэвтэрнэ үү" });
      }

      const score = Number(req.body?.score);
      const comment =
        typeof req.body?.comment === "string"
          ? req.body.comment.trim().slice(0, 500) || null
          : null;
      if (!Number.isInteger(score) || score < 1 || score > 10) {
        return res
          .status(400)
          .json({ message: "Захиалгад 1-10 бүхэл оноо өгнө үү" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            id: req.params.orderId,
            customerId: customer.id,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            organizationId: true,
            items: {
              select: {
                id: true,
                productId: true,
                review: { select: { id: true } },
              },
            },
          },
        });
        if (!order)
          return { status: 404 as const, message: "Захиалга олдсонгүй" };
        if (order.status !== OrderStatus.COMPLETED) {
          return {
            status: 400 as const,
            message: "Зөвхөн хүлээн авсан захиалгыг үнэлнэ",
          };
        }
        if (order.items.some((item) => item.review)) {
          return {
            status: 409 as const,
            message: "Энэ захиалгын үнэлгээ аль хэдийн бүртгэгдсэн",
          };
        }

        if (order.items.length === 0) {
          return {
            status: 400 as const,
            message: "Үнэлэх бараа олдсонгүй",
          };
        }

        await tx.productReview.createMany({
          data: order.items.map((item) => ({
            orderId: order.id,
            orderItemId: item.id,
            productId: item.productId,
            organizationId: order.organizationId,
            customerId: customer.id,
            score,
            comment,
          })),
        });

        const productIds = [
          ...new Set(order.items.map((item) => item.productId)),
        ];
        for (const productId of productIds) {
          const aggregate = await tx.productReview.aggregate({
            where: { productId },
            _avg: { score: true },
            _count: { _all: true },
          });
          await tx.product.update({
            where: { id: productId },
            data: {
              rating: aggregate._avg.score ?? 0,
              reviewCount: aggregate._count._all,
            },
          });
        }

        const organizationAggregate = await tx.productReview.aggregate({
          where: { organizationId: order.organizationId },
          _avg: { score: true },
          _count: { _all: true },
        });
        await tx.organization.update({
          where: { id: order.organizationId },
          data: {
            rating: organizationAggregate._avg.score ?? 0,
            reviewCount: organizationAggregate._count._all,
          },
        });

        return { status: 201 as const, reviewCount: order.items.length };
      });

      if ("message" in result) {
        return res.status(result.status).json({ message: result.message });
      }
      return res.status(result.status).json({
        message: "Үнэлгээ хадгалагдлаа",
        reviewCount: result.reviewCount,
      });
    } catch (error) {
      console.error("store order review error", error);
      return res
        .status(500)
        .json({ message: "Үнэлгээ хадгалахад алдаа гарлаа" });
    }
  },
);

/* ══════════════════════════════════════════════════════════
   GET /store/orders/track?orderNumber=ORD-XXXXXXXX-XXXXXX
   Public order lookup by order number (no auth required).
   Returns limited info for chatbot / guest tracking.
   ══════════════════════════════════════════════════════════ */
router.get("/store/orders/track", async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.query;
    if (
      !orderNumber ||
      typeof orderNumber !== "string" ||
      orderNumber.trim().length < 5
    ) {
      return res.status(400).json({ message: "Захиалгын дугаар оруулна уу" });
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber.trim().toUpperCase(),
        deletedAt: null,
      },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            price: true,
            subtotal: true,
          },
        },
        organization: { select: { name: true } },
        delivery: {
          select: {
            status: true,
            deliveredAt: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Захиалга олдсонгүй" });
    }

    return res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      deliveryCode: order.deliveryCode,
      organizationName: order.organization.name,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map(
        (i: {
          productName: string;
          quantity: number;
          price: any;
          subtotal: any;
        }) => ({
          name: i.productName,
          qty: i.quantity,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        }),
      ),
      delivery: order.delivery
        ? {
            status: order.delivery.status,
            deliveredAt: order.delivery.deliveredAt?.toISOString() || null,
          }
        : null,
    });
  } catch (error) {
    console.error("order track error", error);
    return res.status(500).json({ message: "Захиалга хайхад алдаа гарлаа" });
  }
});

export { router as storeCheckoutRoutes };
