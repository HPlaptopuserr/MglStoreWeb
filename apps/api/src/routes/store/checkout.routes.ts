import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import {
  prisma,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  InventoryReason,
} from "@mgl/database";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import { adjustStock, resolveOrgWarehouse } from "../../services/inventory.service";
import { getVendorMerchantConfig } from "../../services/vendor-merchant.service";

const router: ExpressRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("FATAL: JWT_SECRET not set"); })() : "dev-secret-change-me");

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
      select: { id: true, email: true, role: true, isActive: true, deletedAt: true },
    });
  } catch {
    return null;
  }
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

/* ══════════════════════════════════════════════════════════
   POST /store/checkout
   Creates an Order + OrderItems + QPay mock invoice.
   Body: { lines: [{productId,qty}], phone?, shippingAddress? }
   ══════════════════════════════════════════════════════════ */
router.post("/store/checkout", async (req: Request, res: Response) => {
  try {
    const customer = await getCustomer(req);
    if (!customer || !customer.isActive || customer.deletedAt) {
      return res.status(401).json({ message: "Нэвтэрнэ үү" });
    }

    const { lines, phone, shippingAddress } = req.body as {
      lines?: { productId: string; qty: number }[];
      phone?: string;
      shippingAddress?: string;
    };

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: "Сагс хоосон байна" });
    }

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
        organizationId: true,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "Зарим бараа олдсонгүй эсвэл идэвхгүй байна" });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

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
        return res.status(400).json({ message: `Бараа олдсонгүй: ${line.productId}` });
      }
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
      if (product.stock < qty) {
        return res
          .status(400)
          .json({ message: `${product.name} барааны нөөц хүрэлцэхгүй (${product.stock} ширхэг)` });
      }
      const price = Number(product.price);
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
      return res
        .status(400)
        .json({ message: "Нэг захиалгад зөвхөн нэг дэлгүүрийн бараа байх ёстой" });
    }

    const total = subtotal; // no delivery fee for now

    // Check if vendor has QPay connected
    const merchantRes = await getVendorMerchantConfig(orgIds[0]);
    if (!merchantRes.success || !merchantRes.config) {
      return res.status(400).json({ message: "Дэлгүүр QPay дансаа холбоогүй байна. Төлбөр авах боломжгүй." });
    }
    const merchantContext = merchantRes.config;

    // Create order + items + payment attempt in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Decrement stock through unified adjustStock (warehouse-aware + ledger)
      for (const item of orderItemsData) {
        const warehouseId = await resolveOrgWarehouse(tx, orgIds[0], item.productId);
        await adjustStock(tx, {
          productId: item.productId,
          warehouseId: warehouseId ?? undefined,
          change: -item.quantity,
          reason: InventoryReason.ORDER,
          note: "Онлайн захиалга",
          createdById: customer.id,
          referenceType: "ORDER",
        });
      }

      const ord = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          organizationId: orgIds[0],
          customerId: customer.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.QPAY,
          shippingAddress: shippingAddress || "",
          phone: phone || "",
          subtotal,
          total,
          items: {
            create: orderItemsData,
          },
          history: {
            create: {
              toStatus: OrderStatus.PENDING,
              changedById: customer.id,
              note: "Захиалга үүсгэсэн",
            },
          },
          payments: {
            create: {
              method: PaymentMethod.QPAY,
              status: PaymentStatus.PENDING,
              amount: total,
            },
          },
        },
        include: {
          items: true,
          payments: { select: { id: true, status: true, amount: true } },
        },
      });

      return ord;
    });

    // Create real QPay V2 invoice
    let qpayData;
    try {
      qpayData = await createQPayInvoice({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(order.total),
        merchantContext,
      });
    } catch (err) {
      console.error("QPay invoice creation failed:", err);
      return res.status(502).json({ message: "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа" });
    }

    // Store QPay invoice_id in PaymentAttempt.providerRef
    if (order.payments[0]) {
      await prisma.paymentAttempt.update({
        where: { id: order.payments[0].id },
        data: {
          providerRef: qpayData.invoice_id,
          rawPayload: JSON.parse(JSON.stringify(qpayData)),
        },
      });
    }

    return res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      paymentId: order.payments[0]?.id,
      qrText: qpayData.qr_text,
      qrImage: qpayData.qr_image,
      qpayInvoiceId: qpayData.invoice_id,
      deepLinks: qpayData.urls,
      expiresIn: 300, // 5 minutes
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
   POST /store/checkout/:orderId/confirm
   Check QPay payment status and confirm if paid.
   ══════════════════════════════════════════════════════════ */
router.post("/store/checkout/:orderId/confirm", async (req: Request, res: Response) => {
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
        paymentStatus: true,
        orderNumber: true,
        total: true,
        payments: { where: { method: PaymentMethod.QPAY }, select: { id: true, providerRef: true, status: true } },
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

    // Check QPay payment via invoiceId
    const payment = order.payments[0];
    if (!payment?.providerRef) {
      return res.status(400).json({ message: "QPay нэхэмжлэх олдсонгүй" });
    }

    const merchantRes = await getVendorMerchantConfig(order.organizationId);
    const merchantContext = merchantRes.config ?? undefined;
    const qpayCheck = await checkQPayPayment(payment.providerRef, merchantContext);

    if (qpayCheck.count === 0) {
      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "PENDING",
        message: "Төлбөр хүлээгдэж байна",
      });
    }

    // Payment confirmed — update records
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          rawPayload: JSON.parse(JSON.stringify(qpayCheck)),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          changedById: customer.id,
          note: "QPay төлбөр амжилттай",
        },
      });
    });

    return res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "PAID",
      message: "Төлбөр амжилттай",
    });
  } catch (error) {
    console.error("store confirm error", error);
    return res.status(500).json({ message: "Төлбөр баталгаажуулахад алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /store/checkout/:orderId/payment-status
   Polling endpoint — check QPay payment status.
   ══════════════════════════════════════════════════════════ */
router.get("/store/checkout/:orderId/payment-status", async (req: Request, res: Response) => {
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
        paymentStatus: true,
        orderNumber: true,
        payments: { where: { method: PaymentMethod.QPAY }, select: { id: true, providerRef: true, status: true } },
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

    const merchantRes2 = await getVendorMerchantConfig(order.organizationId);
    const merchantContext2 = merchantRes2.config ?? undefined;
    const qpayCheck = await checkQPayPayment(payment.providerRef, merchantContext2);

    if (qpayCheck.count === 0) {
      return res.json({ status: "PENDING" });
    }

    // Payment found — mark as paid
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          rawPayload: JSON.parse(JSON.stringify(qpayCheck)),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          changedById: customer.id,
          note: "QPay төлбөр амжилттай (auto-poll)",
        },
      });
    });

    return res.json({ status: "PAID" });
  } catch (error) {
    console.error("payment-status error", error);
    return res.status(500).json({ message: "Төлбөр шалгахад алдаа гарлаа" });
  }
});

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
        paymentStatus: true,
        payments: { where: { method: PaymentMethod.QPAY }, select: { id: true, providerRef: true, status: true } },
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

    // Verify with QPay using the vendor's merchant context
    const merchantRes3 = await getVendorMerchantConfig(order.organizationId);
    const merchantContext3 = merchantRes3.config ?? undefined;
    const qpayCheck = await checkQPayPayment(payment.providerRef, merchantContext3);

    if (qpayCheck.count === 0) {
      return res.json({ message: "not yet paid" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          rawPayload: JSON.parse(JSON.stringify(qpayCheck)),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          changedById: order.customerId,
          note: "QPay callback — төлбөр амжилттай",
        },
      });
    });

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
            productName: true,
            quantity: true,
            price: true,
            subtotal: true,
          },
        },
        organization: { select: { name: true } },
      },
    });

    return res.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        deliveryCode: o.deliveryCode,
        organizationName: o.organization.name,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({
          name: i.productName,
          qty: i.quantity,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      })),
    });
  } catch (error) {
    console.error("store orders error", error);
    return res.status(500).json({ message: "Захиалгын жагсаалт авахад алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /store/orders/track?orderNumber=ORD-XXXXXXXX-XXXXXX
   Public order lookup by order number (no auth required).
   Returns limited info for chatbot / guest tracking.
   ══════════════════════════════════════════════════════════ */
router.get("/store/orders/track", async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.query;
    if (!orderNumber || typeof orderNumber !== "string" || orderNumber.trim().length < 5) {
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
      items: order.items.map((i: { productName: string; quantity: number; price: any; subtotal: any }) => ({
        name: i.productName,
        qty: i.quantity,
        price: Number(i.price),
        subtotal: Number(i.subtotal),
      })),
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
