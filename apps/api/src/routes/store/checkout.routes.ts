import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import jwt from "jsonwebtoken";
import { OrderDispatchAttemptStatus } from "@prisma/client";
import {
  DeliverySourceType,
  prisma,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  InventoryReason,
  type Prisma,
} from "@mgl/database";
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
  notifyAssignedOrderDelivery,
  routeOrderDelivery,
} from "../../services/delivery-routing.service";

const router: ExpressRouter = Router();
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

const applyMemberDiscount = (
  price: number,
  percent?: number | null,
  eligible = false,
) => {
  if (!eligible || !percent || percent <= 0) return price;
  return Math.max(0, Math.round(price * (1 - percent / 100)));
};

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
const STORE_CHECKOUT_ACCOUNT_REF =
  process.env.STORE_CHECKOUT_PAYMENT_ACCOUNT_REF?.trim() || "9999";
const STORE_MINIMUM_ORDER_AMOUNT = 50_000;

type StorePaymentAccount = {
  id?: string;
  label?: string;
  merchantName?: string;
  merchantCode?: string;
  username?: string;
  password?: string;
  accountNumber?: string;
};

function accountMatchesStoreCheckoutRef(account: StorePaymentAccount) {
  const ref = STORE_CHECKOUT_ACCOUNT_REF.toLowerCase();
  return [
    account.id,
    account.label,
    account.merchantCode,
    account.accountNumber,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .some((value) => value === ref || value.includes(ref));
}

async function getStoreCheckoutPaymentAccount() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: CONTRACT_PAYMENT_ACCOUNTS_KEY },
    select: { value: true },
  });
  if (!setting?.value) return null;

  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return null;
    return (
      parsed
        .map(
          (account): StorePaymentAccount => ({
            id: String(account?.id || "").trim(),
            label: String(account?.label || "").trim(),
            merchantName: String(account?.merchantName || "").trim(),
            merchantCode: String(account?.merchantCode || "").trim(),
            username: String(
              account?.username || account?.merchantCode || "",
            ).trim(),
            password: String(account?.password || "").trim(),
            accountNumber: String(account?.accountNumber || "").trim(),
          }),
        )
        .find(
          (account) =>
            account.merchantCode && accountMatchesStoreCheckoutRef(account),
        ) || null
    );
  } catch {
    return null;
  }
}

async function advanceExpiredDispatchAttempts(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const expired = await tx.orderDispatchAttempt.findMany({
      where: {
        orderId,
        status: OrderDispatchAttemptStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      select: { id: true },
    });

    if (expired.length === 0) return;

    await tx.orderDispatchAttempt.updateMany({
      where: { id: { in: expired.map((attempt) => attempt.id) } },
      data: {
        status: OrderDispatchAttemptStatus.EXPIRED,
        respondedAt: new Date(),
      },
    });

    const hasActiveAttempt = await tx.orderDispatchAttempt.count({
      where: { orderId, status: OrderDispatchAttemptStatus.PENDING },
    });
    if (hasActiveAttempt > 0) return;

    const next = await tx.orderDispatchAttempt.findFirst({
      where: { orderId, status: OrderDispatchAttemptStatus.QUEUED },
      orderBy: { sequence: "asc" },
      select: { sequence: true },
    });
    if (!next) return;

    await tx.orderDispatchAttempt.updateMany({
      where: {
        orderId,
        status: OrderDispatchAttemptStatus.QUEUED,
        sequence: next.sequence,
      },
      data: {
        status: OrderDispatchAttemptStatus.PENDING,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + DISPATCH_WINDOW_SECONDS * 1000),
      },
    });
  });
}

async function getCheckoutDispatchSnapshot(
  orderId: string,
  customerId: string,
) {
  await advanceExpiredDispatchAttempts(orderId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      orderNumber: true,
      subtotal: true,
      total: true,
      shippingAddress: true,
      customerLat: true,
      customerLng: true,
      branchId: true,
      paymentStatus: true,
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
  const hasAccepted = Boolean(order.branchId);
  const activeZone = activeAttempt?.sequence || null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    status: hasAccepted
      ? "ACCEPTED"
      : activeAttempt
        ? "SEARCHING"
        : queuedCount > 0
          ? "QUEUED"
          : order.dispatchAttempts.length > 0
            ? "NO_BRANCH_AVAILABLE"
            : "NOT_STARTED",
    canPay: hasAccepted && order.paymentStatus !== PaymentStatus.PAID,
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
    activeExpiresAt: activeAttempt?.expiresAt?.toISOString() || null,
    attempts: order.dispatchAttempts.map((attempt) => ({
      id: attempt.id,
      branchId: attempt.branchId,
      status: attempt.status,
      sequence: attempt.sequence,
      distanceKm: attempt.distanceKm,
      requestedAt: attempt.requestedAt.toISOString(),
      expiresAt: attempt.expiresAt?.toISOString() || null,
      respondedAt: attempt.respondedAt?.toISOString() || null,
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
  const storePaymentAccount = await getStoreCheckoutPaymentAccount();
  if (storePaymentAccount?.merchantCode) {
    const systemQr = await createSystemQrInvoice(
      {
        merchantCode: storePaymentAccount.merchantCode,
        amount: params.amount,
        referenceNumber: params.orderId,
        webhook: getStoreQPayCallbackUrl(params.orderId),
      },
      storePaymentAccount.username || undefined,
      storePaymentAccount.password || undefined,
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
        source: "ADMIN_PAYMENT_ACCOUNT",
        accountRef: STORE_CHECKOUT_ACCOUNT_REF,
        merchantCode: storePaymentAccount.merchantCode,
        invoice_id: systemQr.invoiceId,
        qr_text: systemQr.qrText,
        qr_image: "",
        urls: systemQr.urls,
      },
    };
  }

  const systemQrConfig = await getVendorSystemQrConfig(params.organizationId);

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

  const merchantRes = await getVendorMerchantConfig(params.organizationId);
  if (!merchantRes.success || !merchantRes.config) {
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

async function checkStorePayment(params: {
  organizationId: string;
  providerRef: string;
  rawPayload?: unknown;
}) {
  const rawPayload = asRecord(params.rawPayload);
  const provider = String(rawPayload.provider || "").toUpperCase();

  if (provider === "SYSTEMQR") {
    const resolved = await getVendorSystemQrConfig(params.organizationId);
    const adminAccount =
      String(rawPayload.source || "").toUpperCase() === "ADMIN_PAYMENT_ACCOUNT"
        ? await getStoreCheckoutPaymentAccount()
        : null;
    const merchantCode = String(
      rawPayload.merchantCode ||
        adminAccount?.merchantCode ||
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
      String(adminAccount?.username || resolved?.username || "").trim() ||
        undefined,
      String(adminAccount?.password || resolved?.password || "").trim() ||
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
  const assignment = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: { not: PaymentStatus.PAID },
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

    await tx.orderHistory.create({
      data: {
        orderId: order.id,
        fromStatus:
          (order.status as OrderStatus | undefined) ?? OrderStatus.PENDING,
        toStatus: OrderStatus.CONFIRMED,
        changedById: order.customerId,
        note,
      },
    });

    const delivery = await routeOrderDelivery(tx, {
      orderId: order.id,
      sourceType: DeliverySourceType.WEBSITE_ORDER,
    });

    return {
      courierId: delivery.courierId,
      deliveryId: delivery.id,
    };
  });

  if (assignment) {
    await notifyAssignedOrderDelivery({
      ...assignment,
      orderNumber: order.orderNumber,
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
      lines?: { productId: string; qty: number }[];
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
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        stock: true,
        supplyType: true,
        organizationId: true,
        discounts: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          select: { percent: true },
          take: 1,
        },
      },
    });

    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ message: "Зарим бараа олдсонгүй эсвэл идэвхгүй байна" });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const isPreorderOnlyOrder = products.every(
      (product) => product.supplyType === "CHINA_PREORDER",
    );

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
      if (!isPreorder && product.stock < qty) {
        return res.status(400).json({
          message: `${product.name} барааны нөөц хүрэлцэхгүй (${product.stock} ширхэг)`,
        });
      }
      const basePrice = Number(product.price);
      const price = applyMemberDiscount(
        basePrice,
        product.discounts[0]?.percent,
        isActiveMember(customer),
      );
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

    // All products must belong to one organization
    const orgIds = [...new Set(products.map((p) => p.organizationId))];
    if (orgIds.length !== 1) {
      return res.status(400).json({
        message: "Нэг захиалгад зөвхөн нэг дэлгүүрийн бараа байх ёстой",
      });
    }

    const normalizedCustomerLat = toNumberOrNull(customerLat);
    const normalizedCustomerLng = toNumberOrNull(customerLng);
    const total = subtotal; // no delivery fee for now

    if (total < STORE_MINIMUM_ORDER_AMOUNT) {
      return res.status(400).json({
        code: "MINIMUM_ORDER_AMOUNT",
        message: `Захиалгын доод дүн ${STORE_MINIMUM_ORDER_AMOUNT.toLocaleString()}₮ байна.`,
        minimumAmount: STORE_MINIMUM_ORDER_AMOUNT,
        currentAmount: total,
        remainingAmount: STORE_MINIMUM_ORDER_AMOUNT - total,
      });
    }

    if (
      !isPreorderOnlyOrder &&
      (normalizedCustomerLat === null || normalizedCustomerLng === null)
    ) {
      return res.status(400).json({
        code: "CUSTOMER_LOCATION_REQUIRED",
        message:
          "Хүргэлт хайхын тулд хэрэглэгчийн байршлын өргөрөг, уртраг тодорхой байх шаардлагатай.",
      });
    }

    // Create order + items, then prepare branch radar before payment.
    const order = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          organizationId: orgIds[0],
          customerId: customer.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.QPAY,
          shippingAddress:
            shippingAddress ||
            (isPreorderOnlyOrder ? "Урьдчилсан захиалга" : ""),
          phone: normalizedPhone,
          note: orderNote || null,
          customerLat: normalizedCustomerLat,
          customerLng: normalizedCustomerLng,
          subtotal,
          total,
          items: {
            create: orderItemsData,
          },
          history: {
            create: {
              toStatus: OrderStatus.PENDING,
              changedById: customer.id,
              note: isPreorderOnlyOrder
                ? "Урьдчилсан захиалга бүртгэгдсэн"
                : "Захиалга үүсгэж, ойр салбар хайж эхэлсэн",
            },
          },
        },
        include: {
          items: true,
        },
      });

      if (!isPreorderOnlyOrder) {
        await seedOrderDispatchRadar(tx, {
          id: ord.id,
          organizationId: ord.organizationId,
          customerLat: ord.customerLat,
          customerLng: ord.customerLng,
        });
      }

      return ord;
    });

    const dispatch = isPreorderOnlyOrder
      ? null
      : await getCheckoutDispatchSnapshot(order.id, customer.id);
    const dispatchStatus =
      dispatch?.status === "NOT_STARTED" && !isPreorderOnlyOrder
        ? "MANUAL_REVIEW"
        : dispatch?.status || "PREORDER_REGISTERED";

    return res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      paymentId: null,
      paymentRequired: false,
      dispatchStatus,
      preorderOrder: isPreorderOnlyOrder,
      dispatch,
      items: order.items.map((i) => ({
        productId: i.productId,
        name: i.productName,
        qty: i.quantity,
        price: Number(i.price),
        subtotal: Number(i.subtotal),
      })),
    });
  } catch (error) {
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
        },
      });

      if (!order)
        return res.status(404).json({ message: "Захиалга олдсонгүй" });
      if (order.customerId !== customer.id) {
        return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
      }
      const isPreorderOnlyOrder = order.items.every(
        (item) => item.product?.supplyType === "CHINA_PREORDER",
      );
      if (!order.branchId && !isPreorderOnlyOrder) {
        return res.status(409).json({
          message: "Салбар захиалгыг баталгаажуулсны дараа төлбөр төлнө.",
        });
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
          expiresIn: 300,
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
        expiresIn: 300,
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

/* ══════════════════════════════════════════════════════════
   POST /store/qpay/callback
   QPay webhook callback — called by QPay when payment succeeds.
   Query: ?orderId=xxx
   ══════════════════════════════════════════════════════════ */
router.post("/store/qpay/callback", async (req: Request, res: Response) => {
  try {
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

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
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
      },
    });

    return res.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
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
